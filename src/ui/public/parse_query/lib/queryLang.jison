
/**
 * Parser to convert textual structured queries into an AST (Abstract Syntax Tree) representation.
 * <p/>
 * The language that this parser parses is spelled out roughly by this ABNF:
 * <pre>
 * ;; definition for boolean values true/false
 * BOOLEAN_LITERAL  =   "TRUE" / "FALSE"
 *
 * ;; natural definitions for INTEGER and DECIMAL literals
 * INTEGER_LITERAL  =   1*DIGIT
 * DOUBLE_LITERAL   =   1*DIGIT "." *DIGIT
 *
 * ;; IP_LITERAL values are IPV4 literals i.e. 192.168.1.1  masks are currently not supported
 * IP_LITERAL       =   3DIGIT "." 3DIGIT "." 3DIGIT "." 3DIGIT
 *
 * ;; STRING_LITERAL values are double-quoted strings
 * STRING_LITERAL   =   DQUOTE *( ( "\" DQUOTE ) / %x20-21 / %x23-7f ) DQUOTE
 *
 * ;; DATETIME_LITERAL is an ISO 8901 date/time value, ALWAYS specified in GMT
 * DATETIME_LITERAL =   4DIGIT "-" 2DIGIT "-" 2DIGIT "T" 2DIGIT ":" 2DIGIT ":" 2DIGIT "." 3DIGIT "Z"
 *
 * ;; NULL_LITERAL is reserved word for representation of NULL value
 * NULL_LITERAL     =   "NULL"
 *
 * ;; SIMPLE_VALUES are any of the simple atomic types (not SET or RANGE literals)
 * SIMPLE_VALUE     =   INTEGER_LITERAL / DOUBLE_LITERAL / STRING_LITERAL / DATETIME_LITERAL / NULL_LITERAL / BOOLEAN_LITERAL
 *
 * ;; SET_LITERAL represents a mathematical "set" of simple values
 * SET_LITERAL      =   "{" SIMPLE_VALUE *( "," SIMPLE_VALUE ) "}"
 *
 * ;; RANGE_LITERAL represents an interval of simple values, inclusive or exclusive on either end
 * RANGE_LITERAL    =   ( "[" / "(" ) SIMPLE_VALUE "," SIMPLE_VALUE ( "]" / ")" )
 *
 * ;; the comparison operators between fields and simple values
 * COMPARE_OP       =   "=" / ">" / "<" / ">=" / "<=" / "~=" / "∋"
 *
 * ;; a FIELD_NAME is dot-separated "words", where a word is the equivalent of a java identifier
 * WORD             =   (ALPHA / "_") *( ALPHA / DIGIT / "_" )
 * FIELD_NAME       =   WORD *( "." WORD )
 *
 * ;; comparisons compare a field to a simple value
 * COMPARISON       =   FIELD_NAME COMPARE_OP SIMPLE_VALUE
 *
 * ;; an in clause checks whether a field is in a set or range of values
 * IN_CLAUSE        =   FIELD_NAME "IN" ( SET_LITERAL / RANGE_LITERAL )
 *
 * ;; is clause to compare a field with NULL
 * IS_CLAUSE        = FIELD_NAME "IS" NULL_LITERAL
 *
 * ;; binary boolean expressions are built from infix notation with AND and OR
 * BINARY_BOOL      =   EXPR ( "AND" / "OR" ) EXPR
 *
 * ;; unary expressions negation, with a prefix NOT and existance of a set of sub objects with a prefix of EXISTS
 * UNARY_BOOL       =   ("NOT" / "EXISTS") EXPR
 *
 * ;; Match all
 * ANY              =   "ANY"
 *
 * ;; expressions are simple comparisons and their binary combinations. A FIELD_NAME is a valid expression iff the field is a boolean type
 * EXPR             =   ANY / ( FIELD_NAME / COMPARISON / IN_CLAUSE / IS_CLAUSE / BINARY_BOOL / UNARY_BOOL / EXISTS_SCOPE / ( "(" EXPR ")" ) )
 *
 * </pre>
 * <p/>
 *
 */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
"("                   return 'OPAREN'
")"                   return 'CPAREN'
"{"                   return 'OCURLY'
"}"                   return 'CCURLY'
"["                   return 'OBRACK'
"]"                   return 'CBRACK'
","                   return 'COMMA'
"."                   return 'DOT'
"="                   return 'EQ'
"~="                   return 'LIKE'
">"                   return 'GT'
"<"                   return 'LT'
"-"                    return 'DASH'
"AND"                  return 'AND'
"OR"                  return 'OR'
"NOT"                   return 'NOT'
"NULL"                 return 'NULL'
"ANY"                   return 'ANY'
"*"                    return 'ANY'
"IN"                   return 'IN'
"IS"                   return 'IS'
"EXISTS"                  return 'EXISTS'
("TRUE"|"true")                  return 'TRUE'
("FALSE"|"false")                  return 'FALSE'
(?:[0-9]{1,3}\.){3}[0-9]{1,3}  return 'IPV4'
T[0-2][0-9]\:[0-5][0-9]\:[0-5][0-9](Z|\.[0-9]{3}Z) return 'TIME'
[\-]{0,1}[0-9]+             return 'NUMBER'
[\w]?\"(\\.|[^\\"])*\"    return 'STRING'
[A-Za-z0-9_]+                   return 'FIELD'
<<EOF>>               return 'EOF'


/lex

/* operator associations and precedence */

%right OR AND
%left EQ LIKE GT LT
%left NOT EXISTS


%start expressions

%% /* language grammar */

expressions
    : e EOF
      {return new yy.Query($1);}
    | ANY EOF
      {return new yy.Query(new yy.MatchAll()); }
    ;

booleanValue
    : TRUE
      { $$ = true; } 
    | FALSE
      { $$ = false; }
    ;
    
fieldPath
    : FIELD
    | fieldPath DOT FIELD
      { $$ = $1 + '.' + $3; }
    ;

decimal
    : NUMBER DOT NUMBER
      { $$ = parseFloat($1 + "." + $3); }
    ;
    
dateTime
    : date TIME
      {$$ = $1 + $2; }
    ;

date
    : NUMBER DASH NUMBER DASH NUMBER
      {$$ = $1 + $2 + $3 + $4 + $5; }
    ;
    
rangeLiteral
    : OBRACK simpleValue COMMA simpleValue CBRACK
      { $$ = new yy.RangeLiteral($2, $4, false, false); }
    | OBRACK simpleValue COMMA simpleValue CPAREN
      { $$ = new yy.RangeLiteral($2, $4, false, true); }
    | OPAREN simpleValue COMMA simpleValue CPAREN
      { $$ = new yy.RangeLiteral($2, $4, true, true); }
    | OPAREN simpleValue COMMA simpleValue CBRACK
      { $$ = new yy.RangeLiteral($2, $4, true, false); }
    ;
    
setValue
    : simpleValue
      { var arVal = [$1]; 
        $$ = arVal; }
    | setValue COMMA simpleValue
      {$1.push($3);
       $$ = $1;}
    ;

setLiteral
    : OCURLY setValue CCURLY
      { $$ = $2 }
    ;
    
inClause
    : fieldPath IN rangeLiteral
      { $$ = new yy.Range($1, $3); }
    | fieldPath IN setLiteral
      { var boolQ = new yy.BoolExpr();
        var term = new yy.Term($1, '=', $3[0]);
        boolQ.nestedPath = term.nestedPath;
        term.nestedPath = undefined;
        boolQ.orExpr.push(term);
        for(var i=1; i<$3.length; i++) {
          term = new yy.Term($1, '=', $3[i]);
          term.nestedPath = undefined;
          boolQ.orExpr.push(term);
        }
        $$ = boolQ;
      }
    ;
    
isClause
    :  fieldPath IS NULL
      { $$ = new yy.Missing($1); }
    ;
    
simpleValue
    : decimal 
    | NUMBER 
      { $$ = parseInt($1); }
    | STRING | NULL | booleanValue | IPV4
    | date
      { $$ = yy.moment.utc($1); }
    | dateTime
      { $$ = yy.moment.utc($1); }
    ;

operator
    : EQ | LIKE 
    | GT EQ 
      { $$ = '>='; }
    | LT EQ 
      { $$ = '<='; }
    | GT | LT
    ;

comparison
    : fieldPath operator simpleValue
       { $$ = new yy.Term($1, $2, $3); }
    ;

boolExpression
    : e AND e
      { if ($1 instanceof yy.BoolExpr) {
          $1.and($1, $3);
          $$ = $1;
        } else if ($3 instanceof yy.BoolExpr) {
          $3.and($1, $3);
          $$ = $3;
        } else {
          var bExpr = new yy.BoolExpr();
          bExpr.and($1, $3);
          $$ = bExpr;
        }
      }
    | e OR e
      { if ($1 instanceof yy.BoolExpr) {
          $1.or($1, $3);
          $$ = $1;
        } else if ($3 instanceof yy.BoolExpr) {
          $3.or($1, $3);
          $$ = $3;
        } else {
          var bExpr = new yy.BoolExpr();
          bExpr.or($1, $3);
          $$ = bExpr;
        }
      }
    ;

unaryExpression
    : NOT e
      { $$ = new yy.Not($2); }
    | EXISTS e
      { if ($2 instanceof yy.ScopedExpr) {
          $2.exists = true;
          $$ = $2;
        } else {
          var expr = new yy.ScopedExpr($2);
          expr.exists = true;
          $$ = expr;
        }
      }
    ;

e
    : boolExpression
    | unaryExpression
    | comparison
    | fieldPath
      { $$ = new yy.Term($1, '=', true); }
    | inClause
    | isClause
    | OPAREN e CPAREN
      { $$ = new yy.ScopedExpr($2); }
    ;

/* see https://zaach.github.io/jison/try/usf/index.html to test */