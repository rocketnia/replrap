var port = process.env.C9_PORT;

var argStack = [];
var instructionStack = [];
//var environmentStack = [];
var vars = {};
var currentEnvironment = { getVar: function( v ) { return vars[ v ]; } };

function popArgs( n )
{
    return argStack.splice( argStack.length - n, n );
}

function execute()
{
    while ( instructionStack.length !== 0 )
    {
        console.log( instructionStack );
        instructionStack.pop().execute();
    }
}

function argPusher( thunk )
{
    return function() { argStack.push( thunk() ); };
}

function thunk( result )
{
    return function() { return result; };
}

function ThunkInstruction( thunk )
{
    this.execute = argPusher( thunk );
}

function LiteralInstruction( result )
{
    this.execute = argPusher( thunk( result ) );
}

function VariableInstruction( name )
{
    this.execute = argPusher( function() {
        
        return currentEnvironment.getVar( name );
    } );
}

function CallInstruction( funcAndArgs )
{
    var argsAndFunc = funcAndArgs.reverse();
    var numberOfArgs = argsAndFunc.length - 1;
    
    this.execute = function() {
        
        instructionStack.push( new ThunkInstruction( function() {
            
            var args = popArgs( numberOfArgs );
            return argStack.pop().apply( null, args );
        } ) );
        
        instructionStack.push.apply( instructionStack, argsAndFunc );
    };
}

CallInstruction.of = function() {
    
    return new CallInstruction( [].splice.call( arguments, 0 ) );
};

function LiteralInstruction( result )
{
    this.execute = function() { argStack.push( result ); };
}

vars.plus = function( a, b ) { return a + b; };
vars.minus = function( a, b ) { return a - b; };


var readMacros = {};

vars.read = function( cursor ) {
    
    console.log( cursor );
    if ( cursor.atEnd() )
        return null;
    
    return readMacros[ cursor.read() ]( cursor );
};

readMacros[' '] = function( cursor ) {
    
    return vars.read( cursor );
};

readMacros['('] = function( cursor ) {
    
    var oldRightParen = readMacros[')'];
    
    function RightParen() {}
    
    readMacros[')'] = function( cursor ) {
        
        return { instruction: new RightParen(), cursor: cursor };
    };
    
    var funcAndArgs = [];
    while ( true )
    {
        var subResult = vars.read( cursor );
        console.log( subResult );
        if ( subResult === null )
            throw new SyntaxError( "There was an unterminated paren." );
        var subInstruction = subResult.instruction;
        console.log( subInstruction.constructor );
        cursor = subResult.cursor;
        
        if ( typeof subInstruction == "object" &&
            subInstruction.constructor === RightParen )
        {
            readMacros[')'] = oldRightParen;
            var result = { instruction: new CallInstruction( funcAndArgs ),
                cursor: cursor };
            console.log( "yep" );
            return result;
        }
        
        funcAndArgs.push( subInstruction );
    }
};

readMacros['p'] = function( cursor ) {
    
    return { instruction: new VariableInstruction( "plus" ), cursor: cursor };
};

readMacros['m'] = function( cursor ) {
    
    return { instruction: new VariableInstruction( "minus" ), cursor: cursor };
};

readMacros['x'] = function( cursor ) {
    
    return { instruction: new LiteralInstruction( 99 ), cursor: cursor };
};

readMacros['y'] = function( cursor ) {
    
    return { instruction: new LiteralInstruction( 9 ), cursor: cursor };
};

readMacros['"'] = function( cursor ) {
    
    var result = [];
    
    while ( true )
    {
        var char = cursor.read();
        
        if ( char === null )
            throw new SyntaxError( "There was an unterminated string." );
        
        if ( char == '\\' )
        {
            var char2 = cursor.read();
            if ( char2 === null )
                throw new SyntaxError( "There was an unterminated escape." );
            else if ( char2 == '\\' || char2 == '"' )
                result.push( char2 );
            else
                throw new SyntaxError( "There was an unrecognized escape." );
        }
        else if ( char == '"' )
            return { instruction: new LiteralInstruction( result.join('') ),
                cursor: cursor };
        else
            result.push( char );
    }
};

function Cursor( string )
{
    var position = 0;
    this.atEnd = function() { return string.length <= position; };
    this.read = function() { return string.charAt( position++ ); };
}



instructionStack.push( CallInstruction.of(
    new VariableInstruction( "read" ),
    new LiteralInstruction( new Cursor( '(p (m x y) "\\\\y\\"")' ) )
) );

execute();

instructionStack.push( argStack.pop().instruction );

execute();



var root2 = this;
root2.hello = "world";
var root = this;

require('http').createServer( function( req, res ) {
    
    res.writeHead( 200 );
    for ( field in root )
    {
        res.write( "" + field + "\r\n" );
    }
    res.write( "then exports\r\n" );
    for ( field in exports )
    {
        res.write( "" + field + "\r\n" );
    }
    res.write( "" + root + "\r\n" );
    res.write( "" + eval.call( " minus " ) + "\r\n" );
    res.write( "" + (root === exports) + "\r\n" );
//    res.write( "" + (root == Global) + "\r\n" );
    res.write( "argument stack: [" + argStack + "]\r\n" );
    res.write( "instruction stack: [" + instructionStack + "]\r\n" );
    res.write( "done" );
    res.end();
    
} ).listen( port );

console.log( port );