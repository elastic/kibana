// Ottl.g4
grammar ottl;

// --- Parser Rules ---

// Entry Point
statement
    : editor whereClause? EOF
    ;

editor
    : LOWERCASE_IDENTIFIER LPAREN arguments? RPAREN
    ;

converter
    : UPPERCASE_IDENTIFIER LPAREN arguments? RPAREN keys*
    ;

arguments
    : argument ( COMMA argument )*
    ;

argument
    : ( (LOWERCASE_IDENTIFIER EQUAL)? value )
    | UPPERCASE_IDENTIFIER // Standalone function name as argument (less common, based on Go struct)
    ;

whereClause
    : WHERE booleanExpression
    ;

// Boolean Expression Precedence/Structure
booleanExpression
    : term ( OR term )*
    ;

term
    : booleanValue ( AND booleanValue )*
    ;

booleanValue
    : NOT? ( comparison | constExpr | LPAREN booleanExpression RPAREN )
    ;

constExpr
    : BOOLEAN
    | converter // A converter can evaluate to a boolean constant in some contexts
    ;

comparison
    : value comparisonOp value
    ;

comparisonOp
    : EQ | NE | LT | LTE | GT | GTE
    ;

// Value definition - covers all possible value types
value
    : NIL
    | literal // Ambiguity: mathExpression also starts with literals/paths/converters. Let math handle it.
    | mathExpression // Must come before path/converter if they can be part of math
    | BYTES
    | STRING
    | BOOLEAN
    | enumSymbol
    | mapValue
    | listValue
    // A standalone converter or path can also be a value
    | converter
    | path
    ;

literal // Basic literals, excluding paths/converters which are handled separately or within mathExpr
    : FLOAT
    | INT
    // Note: STRING, BOOLEAN, BYTES, NIL are handled directly in 'value'
    ;


// Math Expression Precedence/Structure
mathExpression
    : mathTerm ( ( PLUS | MINUS ) mathTerm )*
    ;

mathTerm
    : mathFactor ( ( STAR | SLASH ) mathFactor )*
    ;

mathFactor // Atomic elements within math or parenthesized expressions
    : FLOAT
    | INT
    | path
    | converter
    | LPAREN mathExpression RPAREN
    ;

// Paths and Indexing
path
    : (LOWERCASE_IDENTIFIER DOT)? field ( DOT field )*
    ;

field
    : LOWERCASE_IDENTIFIER keys*
    ;

keys
    : key+
    ;

key
    : LBRACK ( STRING | INT | mathExpression | path | converter ) RBRACK // Based on Go `key` struct possibilities
    ;

// Enums, Maps, Lists
enumSymbol
    : UPPERCASE_IDENTIFIER // Distinguished from converter by lack of LPAREN in parser context
    ;

mapValue
    : LBRACE ( mapItem ( COMMA mapItem )* )? RBRACE
    ;

mapItem
    : STRING COLON value
    ;

listValue
    : LBRACK ( value ( COMMA value )* )? RBRACK
    ;


// --- Lexer Rules ---

// Keywords (must come before identifiers)
WHERE : 'where' ;
NIL   : 'nil' ;
TRUE  : 'true' ;
FALSE : 'false' ;
NOT   : 'not' ;
OR    : 'or' ;
AND   : 'and' ;

// Operators (order can matter, longer ones first)
GTE : '>=' ;
LTE : '<=' ;
EQ  : '==' ;
NE  : '!=' ;
GT  : '>' ;
LT  : '<' ;
PLUS: '+' ;
MINUS: '-' ;
STAR: '*' ;
SLASH: '/' ;
EQUAL: '=' ;
DOT : '.' ;
COMMA: ',' ;
COLON: ':' ;

// Punctuation
LPAREN: '(' ;
RPAREN: ')' ;
LBRACK: '[' ;
RBRACK: ']' ;
LBRACE: '{' ;
RBRACE: '}' ;

// Literals
BYTES : '0x' [a-fA-F0-9]+ ;
FLOAT : [-+]? [0-9]* '.' [0-9]+ ([eE] [-+]? [0-9]+)? ; // Matches Go definition
INT   : [-+]? [0-9]+ ;
STRING: '"' ( '\\' . | ~('\\'|'"') )* '"' ; // Standard string literal handling escapes

// Identifiers (after keywords)
// Need two types based on starting case for editor vs converter/enum
UPPERCASE_IDENTIFIER : [A-Z] [a-zA-Z0-9_]* ;
LOWERCASE_IDENTIFIER : [a-z] [a-zA-Z0-9_]* ;

// Skip whitespace
WHITESPACE : [ \t\r\n]+ -> skip ;

// Comments (optional, but good practice)
// LINE_COMMENT : '//' ~[\r\n]* -> skip; // If needed