

define(function(require){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,13],$V1=[1,10],$V2=[1,11],$V3=[1,12],$V4=[1,15],$V5=[1,16],$V6=[5,24,46,47],$V7=[5,12,24,31,33,38,39,40,41,42,43,46,47],$V8=[1,42],$V9=[1,43],$Va=[1,35],$Vb=[1,37],$Vc=[1,36],$Vd=[1,39],$Ve=[8,9,14,34,35,36],$Vf=[5,24],$Vg=[5,22,23,24,29,46,47],$Vh=[22,29];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"expressions":3,"e":4,"EOF":5,"ANY":6,"booleanValue":7,"TRUE":8,"FALSE":9,"fieldPath":10,"FIELD":11,"DOT":12,"decimal":13,"NUMBER":14,"dateTime":15,"date":16,"TIME":17,"DASH":18,"rangeLiteral":19,"OBRACK":20,"simpleValue":21,"COMMA":22,"CBRACK":23,"CPAREN":24,"OPAREN":25,"setValue":26,"setLiteral":27,"OCURLY":28,"CCURLY":29,"inClause":30,"IN":31,"isClause":32,"IS":33,"NULL":34,"STRING":35,"IPV4":36,"operator":37,"EQ":38,"LIKE":39,"GT":40,"LT":41,"GTE":42,"LTE":43,"comparison":44,"boolExpression":45,"AND":46,"OR":47,"unaryExpression":48,"NOT":49,"EXISTS":50,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",6:"ANY",8:"TRUE",9:"FALSE",11:"FIELD",12:"DOT",14:"NUMBER",17:"TIME",18:"DASH",20:"OBRACK",22:"COMMA",23:"CBRACK",24:"CPAREN",25:"OPAREN",28:"OCURLY",29:"CCURLY",31:"IN",33:"IS",34:"NULL",35:"STRING",36:"IPV4",38:"EQ",39:"LIKE",40:"GT",41:"LT",42:"GTE",43:"LTE",46:"AND",47:"OR",49:"NOT",50:"EXISTS"},
productions_: [0,[3,2],[3,2],[7,1],[7,1],[10,1],[10,3],[13,3],[15,2],[16,5],[19,5],[19,5],[19,5],[19,5],[26,1],[26,3],[27,3],[30,3],[30,3],[32,3],[21,1],[21,1],[21,1],[21,1],[21,1],[21,1],[21,1],[21,1],[37,1],[37,1],[37,1],[37,1],[37,1],[37,1],[44,3],[45,3],[45,3],[48,2],[48,2],[4,1],[4,1],[4,1],[4,1],[4,1],[4,1],[4,3]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
return new yy.Query($$[$0-1]);
break;
case 2:
return new yy.Query(new yy.MatchAll()); 
break;
case 3:
 this.$ = true; 
break;
case 4:
 this.$ = false; 
break;
case 6:
 this.$ = $$[$0-2] + '.' + $$[$0]; 
break;
case 7:
 this.$ = parseFloat($$[$0-2] + "." + $$[$0]); 
break;
case 8:
this.$ = $$[$0-1] + $$[$0]; 
break;
case 9:
this.$ = $$[$0-4] + $$[$0-3] + $$[$0-2] + $$[$0-1] + $$[$0]; 
break;
case 10:
 this.$ = new yy.RangeLiteral($$[$0-3], $$[$0-1], false, false); 
break;
case 11:
 this.$ = new yy.RangeLiteral($$[$0-3], $$[$0-1], false, true); 
break;
case 12:
 this.$ = new yy.RangeLiteral($$[$0-3], $$[$0-1], true, true); 
break;
case 13:
 this.$ = new yy.RangeLiteral($$[$0-3], $$[$0-1], true, false); 
break;
case 14:
 var arVal = [$$[$0]]; 
        this.$ = arVal; 
break;
case 15:
$$[$0-2].push($$[$0]);
       this.$ = $$[$0-2];
break;
case 16:
 this.$ = $$[$0-1] 
break;
case 17:
 this.$ = new yy.Range($$[$0-2], $$[$0]); 
break;
case 18:
 var boolQ = new yy.BoolExpr();
        var term = new yy.Term($$[$0-2], '=', $$[$0][0]);
        boolQ.nestedPath = term.nestedPath;
        term.nestedPath = undefined;
        boolQ.orExpr.push(term);
        for(var i=1; i<$$[$0].length; i++) {
          term = new yy.Term($$[$0-2], '=', $$[$0][i]);
          term.nestedPath = undefined;
          boolQ.orExpr.push(term);
        }
        this.$ = boolQ;
      
break;
case 19:
 this.$ = new yy.Missing($$[$0-2]); 
break;
case 21:
 this.$ = parseInt($$[$0]); 
break;
case 26: case 27:
 this.$ = yy.moment.utc($$[$0]); 
break;
case 34:
 this.$ = new yy.Term($$[$0-2], $$[$0-1], $$[$0]); 
break;
case 35:
 if ($$[$0-2] instanceof yy.BoolExpr) {
          $$[$0-2].and($$[$0-2], $$[$0]);
          this.$ = $$[$0-2];
        } else if ($$[$0] instanceof yy.BoolExpr) {
          $$[$0].and($$[$0-2], $$[$0]);
          this.$ = $$[$0];
        } else {
          var bExpr = new yy.BoolExpr();
          bExpr.and($$[$0-2], $$[$0]);
          this.$ = bExpr;
        }
      
break;
case 36:
 if ($$[$0-2] instanceof yy.BoolExpr) {
          $$[$0-2].or($$[$0-2], $$[$0]);
          this.$ = $$[$0-2];
        } else if ($$[$0] instanceof yy.BoolExpr) {
          $$[$0].or($$[$0-2], $$[$0]);
          this.$ = $$[$0];
        } else {
          var bExpr = new yy.BoolExpr();
          bExpr.or($$[$0-2], $$[$0]);
          this.$ = bExpr;
        }
      
break;
case 37:
 this.$ = new yy.Not($$[$0]); 
break;
case 38:
 if ($$[$0] instanceof yy.ScopedExpr) {
          $$[$0].exists = true;
          this.$ = $$[$0];
        } else {
          var expr = new yy.ScopedExpr($$[$0]);
          expr.exists = true;
          this.$ = expr;
        }
      
break;
case 42:
 this.$ = new yy.Term($$[$0], '=', true); 
break;
case 45:
 this.$ = new yy.ScopedExpr($$[$0-1]); 
break;
}
},
table: [{3:1,4:2,6:[1,3],10:7,11:$V0,25:$V1,30:8,32:9,44:6,45:4,48:5,49:$V2,50:$V3},{1:[3]},{5:[1,14],46:$V4,47:$V5},{5:[1,17]},o($V6,[2,39]),o($V6,[2,40]),o($V6,[2,41]),o($V6,[2,42],{37:18,12:[1,19],31:[1,20],33:[1,21],38:[1,22],39:[1,23],40:[1,24],41:[1,25],42:[1,26],43:[1,27]}),o($V6,[2,43]),o($V6,[2,44]),{4:28,10:7,11:$V0,25:$V1,30:8,32:9,44:6,45:4,48:5,49:$V2,50:$V3},{4:29,10:7,11:$V0,25:$V1,30:8,32:9,44:6,45:4,48:5,49:$V2,50:$V3},{4:30,10:7,11:$V0,25:$V1,30:8,32:9,44:6,45:4,48:5,49:$V2,50:$V3},o($V7,[2,5]),{1:[2,1]},{4:31,10:7,11:$V0,25:$V1,30:8,32:9,44:6,45:4,48:5,49:$V2,50:$V3},{4:32,10:7,11:$V0,25:$V1,30:8,32:9,44:6,45:4,48:5,49:$V2,50:$V3},{1:[2,2]},{7:38,8:$V8,9:$V9,13:34,14:$Va,15:41,16:40,21:33,34:$Vb,35:$Vc,36:$Vd},{11:[1,44]},{19:45,20:[1,47],25:[1,48],27:46,28:[1,49]},{34:[1,50]},o($Ve,[2,28]),o($Ve,[2,29]),o($Ve,[2,30]),o($Ve,[2,31]),o($Ve,[2,32]),o($Ve,[2,33]),{24:[1,51],46:$V4,47:$V5},o($V6,[2,37]),o($V6,[2,38]),o($Vf,[2,35],{46:$V4,47:$V5}),o($Vf,[2,36],{46:$V4,47:$V5}),o($V6,[2,34]),o($Vg,[2,20]),o($Vg,[2,21],{12:[1,52],18:[1,53]}),o($Vg,[2,22]),o($Vg,[2,23]),o($Vg,[2,24]),o($Vg,[2,25]),o($Vg,[2,26],{17:[1,54]}),o($Vg,[2,27]),o($Vg,[2,3]),o($Vg,[2,4]),o($V7,[2,6]),o($V6,[2,17]),o($V6,[2,18]),{7:38,8:$V8,9:$V9,13:34,14:$Va,15:41,16:40,21:55,34:$Vb,35:$Vc,36:$Vd},{7:38,8:$V8,9:$V9,13:34,14:$Va,15:41,16:40,21:56,34:$Vb,35:$Vc,36:$Vd},{7:38,8:$V8,9:$V9,13:34,14:$Va,15:41,16:40,21:58,26:57,34:$Vb,35:$Vc,36:$Vd},o($V6,[2,19]),o($V6,[2,45]),{14:[1,59]},{14:[1,60]},o($Vg,[2,8]),{22:[1,61]},{22:[1,62]},{22:[1,64],29:[1,63]},o($Vh,[2,14]),o($Vg,[2,7]),{18:[1,65]},{7:38,8:$V8,9:$V9,13:34,14:$Va,15:41,16:40,21:66,34:$Vb,35:$Vc,36:$Vd},{7:38,8:$V8,9:$V9,13:34,14:$Va,15:41,16:40,21:67,34:$Vb,35:$Vc,36:$Vd},o($V6,[2,16]),{7:38,8:$V8,9:$V9,13:34,14:$Va,15:41,16:40,21:68,34:$Vb,35:$Vc,36:$Vd},{14:[1,69]},{23:[1,70],24:[1,71]},{23:[1,73],24:[1,72]},o($Vh,[2,15]),o([5,17,22,23,24,29,46,47],[2,9]),o($V6,[2,10]),o($V6,[2,11]),o($V6,[2,12]),o($V6,[2,13])],
defaultActions: {14:[2,1],17:[2,2]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        function _parseError (msg, hash) {
            this.message = msg;
            this.hash = hash;
        }
        _parseError.prototype = Error;

        throw new _parseError(str, hash);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        var lex = function () {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        };
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};

/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:/* skip whitespace */
break;
case 1:return 25
break;
case 2:return 24
break;
case 3:return 28
break;
case 4:return 29
break;
case 5:return 20
break;
case 6:return 23
break;
case 7:return 22
break;
case 8:return 12
break;
case 9:return 38
break;
case 10:return 39
break;
case 11:return 40
break;
case 12:return 41
break;
case 13:return 42
break;
case 14:return 43
break;
case 15:return 18
break;
case 16:return 46
break;
case 17:return 47
break;
case 18:return 49
break;
case 19:return 34
break;
case 20:return 6
break;
case 21:return 6
break;
case 22:return 31
break;
case 23:return 33
break;
case 24:return 50
break;
case 25:return 8
break;
case 26:return 9
break;
case 27:return 36
break;
case 28:return 17
break;
case 29:return 14
break;
case 30:return 35
break;
case 31:return 11
break;
case 32:return 5
break;
}
},
rules: [/^(?:\s+)/,/^(?:\()/,/^(?:\))/,/^(?:\{)/,/^(?:\})/,/^(?:\[)/,/^(?:\])/,/^(?:,)/,/^(?:\.)/,/^(?:=)/,/^(?:~=)/,/^(?:>)/,/^(?:<)/,/^(?:>=)/,/^(?:<=)/,/^(?:-)/,/^(?:AND\b)/,/^(?:OR\b)/,/^(?:NOT\b)/,/^(?:NULL\b)/,/^(?:ANY\b)/,/^(?:\*)/,/^(?:IN\b)/,/^(?:IS\b)/,/^(?:EXISTS\b)/,/^(?:(TRUE|true))/,/^(?:(FALSE|false))/,/^(?:(?:[0-9]{1,3}\.){3}[0-9]{1,3})/,/^(?:T[0-2][0-9]:[0-5][0-9]:[0-5][0-9](Z|\.[0-9]{3}Z))/,/^(?:[0-9]+)/,/^(?:[\w]?"(\\.|[^\\"])*")/,/^(?:[A-Za-z_\-]+)/,/^(?:$)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
return parser;
});