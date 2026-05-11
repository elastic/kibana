// eql.g4
grammar Eql;

// Tokens
EQ: '==';
NEQ: '!=';
GT: '>';
LT: '<';
GTE: '>=';
LTE: '<=';
ADD: '+';
SUB: '-';
MUL: '*';
DIV: '/';
MOD: '%';
AND: 'and' | 'AND';
OR: 'or' | 'OR';
TRUE: 'true' | 'TRUE';
FALSE: 'false' | 'FALSE';
FLOAT: [\-]? [0-9]+ '.' [0-9]+;
NUMBER: [\-]? [0-9]+;
WHITESPACE: [ \r\n\t]+ -> skip;
NOT: 'NOT' | 'not';
NAME: [a-zA-Z_] [a-zA-Z0-9_]*;
VNAME: [a-zA-Z0-9_\-/]+('.'[a-zA-Z0-9_\-/]+)*;
STEXT: '\'' ~[\r\n']* '\'';
DTEXT: '"' ~[\r\n"]* '"';
LPAR: '(';
RPAR: ')';
LARR: '[';
RARR: ']';
LDICT: '{';
RDICT: '}';
BEGIN_EVARIABLE: '$${';
BEGIN_VARIABLE: '${';

expList: exp EOF;

boolean
: TRUE | FALSE
;

constant
: STEXT
| DTEXT
| FLOAT
| NUMBER
| boolean
;

variable
: NAME
| VNAME
| constant
;

variableExp
: variable( '|' variable)*
;

exp
: LPAR exp RPAR # ExpInParen
| left=exp (MUL | DIV | MOD) right=exp # ExpArithmeticMulDivMod
| left=exp (ADD | SUB) right=exp # ExpArithmeticAddSub
| NOT exp # ExpNot
| left=exp EQ right=exp # ExpArithmeticEQ
| left=exp NEQ right=exp # ExpArithmeticNEQ
| left=exp LTE right=exp # ExpArithmeticLTE
| left=exp GTE right=exp # ExpArithmeticGTE
| left=exp LT right=exp # ExpArithmeticLT
| left=exp GT right=exp # ExpArithmeticGT
| left=exp AND right=exp # ExpLogicalAnd
| left=exp OR right=exp # ExpLogicalOR
| boolean # ExpBoolean
| BEGIN_EVARIABLE variableExp RDICT # ExpEVariable
| BEGIN_VARIABLE variableExp RDICT # ExpVariable
| NAME LPAR arguments? RPAR # ExpFunction
| LARR array? RARR # ExpArray
| LDICT dict? RDICT # ExpDict
| (STEXT | DTEXT) # ExpText
| FLOAT # ExpFloat
| NUMBER # ExpNumber
;

arguments
: exp( ',' exp)*
;

array
: constant( ',' constant)*
;

key
: (NAME | STEXT | DTEXT) ':' constant
;

dict
: key( ',' key)*
;
