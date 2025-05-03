// Generated from src/ottl/antlr/ottl.g4 by ANTLR 4.13.2
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
	ATN,
	ATNDeserializer, DecisionState, DFA, FailedPredicateException,
	RecognitionException, NoViableAltException, BailErrorStrategy,
	Parser, ParserATNSimulator,
	RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache,
	TerminalNode, RuleNode,
	Token, TokenStream,
	Interval, IntervalSet
} from 'antlr4';
import ottlListener from "./ottlListener.js";
// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class ottlParser extends Parser {
	public static readonly WHERE = 1;
	public static readonly NIL = 2;
	public static readonly TRUE = 3;
	public static readonly FALSE = 4;
	public static readonly NOT = 5;
	public static readonly OR = 6;
	public static readonly AND = 7;
	public static readonly GTE = 8;
	public static readonly LTE = 9;
	public static readonly EQ = 10;
	public static readonly NE = 11;
	public static readonly GT = 12;
	public static readonly LT = 13;
	public static readonly PLUS = 14;
	public static readonly MINUS = 15;
	public static readonly STAR = 16;
	public static readonly SLASH = 17;
	public static readonly EQUAL = 18;
	public static readonly DOT = 19;
	public static readonly COMMA = 20;
	public static readonly COLON = 21;
	public static readonly LPAREN = 22;
	public static readonly RPAREN = 23;
	public static readonly LBRACK = 24;
	public static readonly RBRACK = 25;
	public static readonly LBRACE = 26;
	public static readonly RBRACE = 27;
	public static readonly BYTES = 28;
	public static readonly FLOAT = 29;
	public static readonly INT = 30;
	public static readonly STRING = 31;
	public static readonly UPPERCASE_IDENTIFIER = 32;
	public static readonly LOWERCASE_IDENTIFIER = 33;
	public static readonly WHITESPACE = 34;
	public static readonly BOOLEAN = 35;
	public static override readonly EOF = Token.EOF;
	public static readonly RULE_statement = 0;
	public static readonly RULE_editor = 1;
	public static readonly RULE_converter = 2;
	public static readonly RULE_arguments = 3;
	public static readonly RULE_argument = 4;
	public static readonly RULE_whereClause = 5;
	public static readonly RULE_booleanExpression = 6;
	public static readonly RULE_term = 7;
	public static readonly RULE_booleanValue = 8;
	public static readonly RULE_constExpr = 9;
	public static readonly RULE_comparison = 10;
	public static readonly RULE_comparisonOp = 11;
	public static readonly RULE_value = 12;
	public static readonly RULE_literal = 13;
	public static readonly RULE_mathExpression = 14;
	public static readonly RULE_mathTerm = 15;
	public static readonly RULE_mathFactor = 16;
	public static readonly RULE_path = 17;
	public static readonly RULE_field = 18;
	public static readonly RULE_keys = 19;
	public static readonly RULE_key = 20;
	public static readonly RULE_enumSymbol = 21;
	public static readonly RULE_mapValue = 22;
	public static readonly RULE_mapItem = 23;
	public static readonly RULE_listValue = 24;
	public static readonly literalNames: (string | null)[] = [ null, "'where'", 
                                                            "'nil'", "'true'", 
                                                            "'false'", "'not'", 
                                                            "'or'", "'and'", 
                                                            "'>='", "'<='", 
                                                            "'=='", "'!='", 
                                                            "'>'", "'<'", 
                                                            "'+'", "'-'", 
                                                            "'*'", "'/'", 
                                                            "'='", "'.'", 
                                                            "','", "':'", 
                                                            "'('", "')'", 
                                                            "'['", "']'", 
                                                            "'{'", "'}'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "WHERE", 
                                                             "NIL", "TRUE", 
                                                             "FALSE", "NOT", 
                                                             "OR", "AND", 
                                                             "GTE", "LTE", 
                                                             "EQ", "NE", 
                                                             "GT", "LT", 
                                                             "PLUS", "MINUS", 
                                                             "STAR", "SLASH", 
                                                             "EQUAL", "DOT", 
                                                             "COMMA", "COLON", 
                                                             "LPAREN", "RPAREN", 
                                                             "LBRACK", "RBRACK", 
                                                             "LBRACE", "RBRACE", 
                                                             "BYTES", "FLOAT", 
                                                             "INT", "STRING", 
                                                             "UPPERCASE_IDENTIFIER", 
                                                             "LOWERCASE_IDENTIFIER", 
                                                             "WHITESPACE", 
                                                             "BOOLEAN" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"statement", "editor", "converter", "arguments", "argument", "whereClause", 
		"booleanExpression", "term", "booleanValue", "constExpr", "comparison", 
		"comparisonOp", "value", "literal", "mathExpression", "mathTerm", "mathFactor", 
		"path", "field", "keys", "key", "enumSymbol", "mapValue", "mapItem", "listValue",
	];
	public get grammarFileName(): string { return "ottl.g4"; }
	public get literalNames(): (string | null)[] { return ottlParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return ottlParser.symbolicNames; }
	public get ruleNames(): string[] { return ottlParser.ruleNames; }
	public get serializedATN(): number[] { return ottlParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, ottlParser._ATN, ottlParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public statement(): StatementContext {
		let localctx: StatementContext = new StatementContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, ottlParser.RULE_statement);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 50;
			this.editor();
			this.state = 52;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===1) {
				{
				this.state = 51;
				this.whereClause();
				}
			}

			this.state = 54;
			this.match(ottlParser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public editor(): EditorContext {
		let localctx: EditorContext = new EditorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 2, ottlParser.RULE_editor);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 56;
			this.match(ottlParser.LOWERCASE_IDENTIFIER);
			this.state = 57;
			this.match(ottlParser.LPAREN);
			this.state = 59;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4114612228) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 11) !== 0)) {
				{
				this.state = 58;
				this.arguments();
				}
			}

			this.state = 61;
			this.match(ottlParser.RPAREN);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public converter(): ConverterContext {
		let localctx: ConverterContext = new ConverterContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, ottlParser.RULE_converter);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 63;
			this.match(ottlParser.UPPERCASE_IDENTIFIER);
			this.state = 64;
			this.match(ottlParser.LPAREN);
			this.state = 66;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4114612228) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 11) !== 0)) {
				{
				this.state = 65;
				this.arguments();
				}
			}

			this.state = 68;
			this.match(ottlParser.RPAREN);
			this.state = 72;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===24) {
				{
				{
				this.state = 69;
				this.keys();
				}
				}
				this.state = 74;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public arguments(): ArgumentsContext {
		let localctx: ArgumentsContext = new ArgumentsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, ottlParser.RULE_arguments);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 75;
			this.argument();
			this.state = 80;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===20) {
				{
				{
				this.state = 76;
				this.match(ottlParser.COMMA);
				this.state = 77;
				this.argument();
				}
				}
				this.state = 82;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public argument(): ArgumentContext {
		let localctx: ArgumentContext = new ArgumentContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, ottlParser.RULE_argument);
		try {
			this.state = 89;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				{
				this.state = 85;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 5, this._ctx) ) {
				case 1:
					{
					this.state = 83;
					this.match(ottlParser.LOWERCASE_IDENTIFIER);
					this.state = 84;
					this.match(ottlParser.EQUAL);
					}
					break;
				}
				this.state = 87;
				this.value();
				}
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 88;
				this.match(ottlParser.UPPERCASE_IDENTIFIER);
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public whereClause(): WhereClauseContext {
		let localctx: WhereClauseContext = new WhereClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, ottlParser.RULE_whereClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 91;
			this.match(ottlParser.WHERE);
			this.state = 92;
			this.booleanExpression();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public booleanExpression(): BooleanExpressionContext {
		let localctx: BooleanExpressionContext = new BooleanExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, ottlParser.RULE_booleanExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 94;
			this.term();
			this.state = 99;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===6) {
				{
				{
				this.state = 95;
				this.match(ottlParser.OR);
				this.state = 96;
				this.term();
				}
				}
				this.state = 101;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public term(): TermContext {
		let localctx: TermContext = new TermContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, ottlParser.RULE_term);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 102;
			this.booleanValue();
			this.state = 107;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===7) {
				{
				{
				this.state = 103;
				this.match(ottlParser.AND);
				this.state = 104;
				this.booleanValue();
				}
				}
				this.state = 109;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public booleanValue(): BooleanValueContext {
		let localctx: BooleanValueContext = new BooleanValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 16, ottlParser.RULE_booleanValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 111;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===5) {
				{
				this.state = 110;
				this.match(ottlParser.NOT);
				}
			}

			this.state = 119;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 10, this._ctx) ) {
			case 1:
				{
				this.state = 113;
				this.comparison();
				}
				break;
			case 2:
				{
				this.state = 114;
				this.constExpr();
				}
				break;
			case 3:
				{
				this.state = 115;
				this.match(ottlParser.LPAREN);
				this.state = 116;
				this.booleanExpression();
				this.state = 117;
				this.match(ottlParser.RPAREN);
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public constExpr(): ConstExprContext {
		let localctx: ConstExprContext = new ConstExprContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, ottlParser.RULE_constExpr);
		try {
			this.state = 123;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 35:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 121;
				this.match(ottlParser.BOOLEAN);
				}
				break;
			case 32:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 122;
				this.converter();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public comparison(): ComparisonContext {
		let localctx: ComparisonContext = new ComparisonContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, ottlParser.RULE_comparison);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 125;
			this.value();
			this.state = 126;
			this.comparisonOp();
			this.state = 127;
			this.value();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public comparisonOp(): ComparisonOpContext {
		let localctx: ComparisonOpContext = new ComparisonOpContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, ottlParser.RULE_comparisonOp);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 129;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 16128) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public value(): ValueContext {
		let localctx: ValueContext = new ValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, ottlParser.RULE_value);
		try {
			this.state = 142;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 131;
				this.match(ottlParser.NIL);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 132;
				this.literal();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 133;
				this.mathExpression();
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 134;
				this.match(ottlParser.BYTES);
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 135;
				this.match(ottlParser.STRING);
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 136;
				this.match(ottlParser.BOOLEAN);
				}
				break;
			case 7:
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 137;
				this.enumSymbol();
				}
				break;
			case 8:
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 138;
				this.mapValue();
				}
				break;
			case 9:
				this.enterOuterAlt(localctx, 9);
				{
				this.state = 139;
				this.listValue();
				}
				break;
			case 10:
				this.enterOuterAlt(localctx, 10);
				{
				this.state = 140;
				this.converter();
				}
				break;
			case 11:
				this.enterOuterAlt(localctx, 11);
				{
				this.state = 141;
				this.path();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public literal(): LiteralContext {
		let localctx: LiteralContext = new LiteralContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, ottlParser.RULE_literal);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 144;
			_la = this._input.LA(1);
			if(!(_la===29 || _la===30)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public mathExpression(): MathExpressionContext {
		let localctx: MathExpressionContext = new MathExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 28, ottlParser.RULE_mathExpression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 146;
			this.mathTerm();
			this.state = 151;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===14 || _la===15) {
				{
				{
				this.state = 147;
				_la = this._input.LA(1);
				if(!(_la===14 || _la===15)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 148;
				this.mathTerm();
				}
				}
				this.state = 153;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public mathTerm(): MathTermContext {
		let localctx: MathTermContext = new MathTermContext(this, this._ctx, this.state);
		this.enterRule(localctx, 30, ottlParser.RULE_mathTerm);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 154;
			this.mathFactor();
			this.state = 159;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===16 || _la===17) {
				{
				{
				this.state = 155;
				_la = this._input.LA(1);
				if(!(_la===16 || _la===17)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 156;
				this.mathFactor();
				}
				}
				this.state = 161;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public mathFactor(): MathFactorContext {
		let localctx: MathFactorContext = new MathFactorContext(this, this._ctx, this.state);
		this.enterRule(localctx, 32, ottlParser.RULE_mathFactor);
		try {
			this.state = 170;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 29:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 162;
				this.match(ottlParser.FLOAT);
				}
				break;
			case 30:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 163;
				this.match(ottlParser.INT);
				}
				break;
			case 33:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 164;
				this.path();
				}
				break;
			case 32:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 165;
				this.converter();
				}
				break;
			case 22:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 166;
				this.match(ottlParser.LPAREN);
				this.state = 167;
				this.mathExpression();
				this.state = 168;
				this.match(ottlParser.RPAREN);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public path(): PathContext {
		let localctx: PathContext = new PathContext(this, this._ctx, this.state);
		this.enterRule(localctx, 34, ottlParser.RULE_path);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 174;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 16, this._ctx) ) {
			case 1:
				{
				this.state = 172;
				this.match(ottlParser.LOWERCASE_IDENTIFIER);
				this.state = 173;
				this.match(ottlParser.DOT);
				}
				break;
			}
			this.state = 176;
			this.field();
			this.state = 181;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===19) {
				{
				{
				this.state = 177;
				this.match(ottlParser.DOT);
				this.state = 178;
				this.field();
				}
				}
				this.state = 183;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public field(): FieldContext {
		let localctx: FieldContext = new FieldContext(this, this._ctx, this.state);
		this.enterRule(localctx, 36, ottlParser.RULE_field);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 184;
			this.match(ottlParser.LOWERCASE_IDENTIFIER);
			this.state = 188;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===24) {
				{
				{
				this.state = 185;
				this.keys();
				}
				}
				this.state = 190;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public keys(): KeysContext {
		let localctx: KeysContext = new KeysContext(this, this._ctx, this.state);
		this.enterRule(localctx, 38, ottlParser.RULE_keys);
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 192;
			this._errHandler.sync(this);
			_alt = 1;
			do {
				switch (_alt) {
				case 1:
					{
					{
					this.state = 191;
					this.key();
					}
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				this.state = 194;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 19, this._ctx);
			} while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public key(): KeyContext {
		let localctx: KeyContext = new KeyContext(this, this._ctx, this.state);
		this.enterRule(localctx, 40, ottlParser.RULE_key);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 196;
			this.match(ottlParser.LBRACK);
			this.state = 202;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 20, this._ctx) ) {
			case 1:
				{
				this.state = 197;
				this.match(ottlParser.STRING);
				}
				break;
			case 2:
				{
				this.state = 198;
				this.match(ottlParser.INT);
				}
				break;
			case 3:
				{
				this.state = 199;
				this.mathExpression();
				}
				break;
			case 4:
				{
				this.state = 200;
				this.path();
				}
				break;
			case 5:
				{
				this.state = 201;
				this.converter();
				}
				break;
			}
			this.state = 204;
			this.match(ottlParser.RBRACK);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public enumSymbol(): EnumSymbolContext {
		let localctx: EnumSymbolContext = new EnumSymbolContext(this, this._ctx, this.state);
		this.enterRule(localctx, 42, ottlParser.RULE_enumSymbol);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 206;
			this.match(ottlParser.UPPERCASE_IDENTIFIER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public mapValue(): MapValueContext {
		let localctx: MapValueContext = new MapValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 44, ottlParser.RULE_mapValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 208;
			this.match(ottlParser.LBRACE);
			this.state = 217;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===31) {
				{
				this.state = 209;
				this.mapItem();
				this.state = 214;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===20) {
					{
					{
					this.state = 210;
					this.match(ottlParser.COMMA);
					this.state = 211;
					this.mapItem();
					}
					}
					this.state = 216;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 219;
			this.match(ottlParser.RBRACE);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public mapItem(): MapItemContext {
		let localctx: MapItemContext = new MapItemContext(this, this._ctx, this.state);
		this.enterRule(localctx, 46, ottlParser.RULE_mapItem);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 221;
			this.match(ottlParser.STRING);
			this.state = 222;
			this.match(ottlParser.COLON);
			this.state = 223;
			this.value();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public listValue(): ListValueContext {
		let localctx: ListValueContext = new ListValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 48, ottlParser.RULE_listValue);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 225;
			this.match(ottlParser.LBRACK);
			this.state = 234;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 4114612228) !== 0) || ((((_la - 32)) & ~0x1F) === 0 && ((1 << (_la - 32)) & 11) !== 0)) {
				{
				this.state = 226;
				this.value();
				this.state = 231;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===20) {
					{
					{
					this.state = 227;
					this.match(ottlParser.COMMA);
					this.state = 228;
					this.value();
					}
					}
					this.state = 233;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
			}

			this.state = 236;
			this.match(ottlParser.RBRACK);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public static readonly _serializedATN: number[] = [4,1,35,239,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,
	10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,
	7,17,2,18,7,18,2,19,7,19,2,20,7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,7,
	24,1,0,1,0,3,0,53,8,0,1,0,1,0,1,1,1,1,1,1,3,1,60,8,1,1,1,1,1,1,2,1,2,1,
	2,3,2,67,8,2,1,2,1,2,5,2,71,8,2,10,2,12,2,74,9,2,1,3,1,3,1,3,5,3,79,8,3,
	10,3,12,3,82,9,3,1,4,1,4,3,4,86,8,4,1,4,1,4,3,4,90,8,4,1,5,1,5,1,5,1,6,
	1,6,1,6,5,6,98,8,6,10,6,12,6,101,9,6,1,7,1,7,1,7,5,7,106,8,7,10,7,12,7,
	109,9,7,1,8,3,8,112,8,8,1,8,1,8,1,8,1,8,1,8,1,8,3,8,120,8,8,1,9,1,9,3,9,
	124,8,9,1,10,1,10,1,10,1,10,1,11,1,11,1,12,1,12,1,12,1,12,1,12,1,12,1,12,
	1,12,1,12,1,12,1,12,3,12,143,8,12,1,13,1,13,1,14,1,14,1,14,5,14,150,8,14,
	10,14,12,14,153,9,14,1,15,1,15,1,15,5,15,158,8,15,10,15,12,15,161,9,15,
	1,16,1,16,1,16,1,16,1,16,1,16,1,16,1,16,3,16,171,8,16,1,17,1,17,3,17,175,
	8,17,1,17,1,17,1,17,5,17,180,8,17,10,17,12,17,183,9,17,1,18,1,18,5,18,187,
	8,18,10,18,12,18,190,9,18,1,19,4,19,193,8,19,11,19,12,19,194,1,20,1,20,
	1,20,1,20,1,20,1,20,3,20,203,8,20,1,20,1,20,1,21,1,21,1,22,1,22,1,22,1,
	22,5,22,213,8,22,10,22,12,22,216,9,22,3,22,218,8,22,1,22,1,22,1,23,1,23,
	1,23,1,23,1,24,1,24,1,24,1,24,5,24,230,8,24,10,24,12,24,233,9,24,3,24,235,
	8,24,1,24,1,24,1,24,0,0,25,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,
	34,36,38,40,42,44,46,48,0,4,1,0,8,13,1,0,29,30,1,0,14,15,1,0,16,17,254,
	0,50,1,0,0,0,2,56,1,0,0,0,4,63,1,0,0,0,6,75,1,0,0,0,8,89,1,0,0,0,10,91,
	1,0,0,0,12,94,1,0,0,0,14,102,1,0,0,0,16,111,1,0,0,0,18,123,1,0,0,0,20,125,
	1,0,0,0,22,129,1,0,0,0,24,142,1,0,0,0,26,144,1,0,0,0,28,146,1,0,0,0,30,
	154,1,0,0,0,32,170,1,0,0,0,34,174,1,0,0,0,36,184,1,0,0,0,38,192,1,0,0,0,
	40,196,1,0,0,0,42,206,1,0,0,0,44,208,1,0,0,0,46,221,1,0,0,0,48,225,1,0,
	0,0,50,52,3,2,1,0,51,53,3,10,5,0,52,51,1,0,0,0,52,53,1,0,0,0,53,54,1,0,
	0,0,54,55,5,0,0,1,55,1,1,0,0,0,56,57,5,33,0,0,57,59,5,22,0,0,58,60,3,6,
	3,0,59,58,1,0,0,0,59,60,1,0,0,0,60,61,1,0,0,0,61,62,5,23,0,0,62,3,1,0,0,
	0,63,64,5,32,0,0,64,66,5,22,0,0,65,67,3,6,3,0,66,65,1,0,0,0,66,67,1,0,0,
	0,67,68,1,0,0,0,68,72,5,23,0,0,69,71,3,38,19,0,70,69,1,0,0,0,71,74,1,0,
	0,0,72,70,1,0,0,0,72,73,1,0,0,0,73,5,1,0,0,0,74,72,1,0,0,0,75,80,3,8,4,
	0,76,77,5,20,0,0,77,79,3,8,4,0,78,76,1,0,0,0,79,82,1,0,0,0,80,78,1,0,0,
	0,80,81,1,0,0,0,81,7,1,0,0,0,82,80,1,0,0,0,83,84,5,33,0,0,84,86,5,18,0,
	0,85,83,1,0,0,0,85,86,1,0,0,0,86,87,1,0,0,0,87,90,3,24,12,0,88,90,5,32,
	0,0,89,85,1,0,0,0,89,88,1,0,0,0,90,9,1,0,0,0,91,92,5,1,0,0,92,93,3,12,6,
	0,93,11,1,0,0,0,94,99,3,14,7,0,95,96,5,6,0,0,96,98,3,14,7,0,97,95,1,0,0,
	0,98,101,1,0,0,0,99,97,1,0,0,0,99,100,1,0,0,0,100,13,1,0,0,0,101,99,1,0,
	0,0,102,107,3,16,8,0,103,104,5,7,0,0,104,106,3,16,8,0,105,103,1,0,0,0,106,
	109,1,0,0,0,107,105,1,0,0,0,107,108,1,0,0,0,108,15,1,0,0,0,109,107,1,0,
	0,0,110,112,5,5,0,0,111,110,1,0,0,0,111,112,1,0,0,0,112,119,1,0,0,0,113,
	120,3,20,10,0,114,120,3,18,9,0,115,116,5,22,0,0,116,117,3,12,6,0,117,118,
	5,23,0,0,118,120,1,0,0,0,119,113,1,0,0,0,119,114,1,0,0,0,119,115,1,0,0,
	0,120,17,1,0,0,0,121,124,5,35,0,0,122,124,3,4,2,0,123,121,1,0,0,0,123,122,
	1,0,0,0,124,19,1,0,0,0,125,126,3,24,12,0,126,127,3,22,11,0,127,128,3,24,
	12,0,128,21,1,0,0,0,129,130,7,0,0,0,130,23,1,0,0,0,131,143,5,2,0,0,132,
	143,3,26,13,0,133,143,3,28,14,0,134,143,5,28,0,0,135,143,5,31,0,0,136,143,
	5,35,0,0,137,143,3,42,21,0,138,143,3,44,22,0,139,143,3,48,24,0,140,143,
	3,4,2,0,141,143,3,34,17,0,142,131,1,0,0,0,142,132,1,0,0,0,142,133,1,0,0,
	0,142,134,1,0,0,0,142,135,1,0,0,0,142,136,1,0,0,0,142,137,1,0,0,0,142,138,
	1,0,0,0,142,139,1,0,0,0,142,140,1,0,0,0,142,141,1,0,0,0,143,25,1,0,0,0,
	144,145,7,1,0,0,145,27,1,0,0,0,146,151,3,30,15,0,147,148,7,2,0,0,148,150,
	3,30,15,0,149,147,1,0,0,0,150,153,1,0,0,0,151,149,1,0,0,0,151,152,1,0,0,
	0,152,29,1,0,0,0,153,151,1,0,0,0,154,159,3,32,16,0,155,156,7,3,0,0,156,
	158,3,32,16,0,157,155,1,0,0,0,158,161,1,0,0,0,159,157,1,0,0,0,159,160,1,
	0,0,0,160,31,1,0,0,0,161,159,1,0,0,0,162,171,5,29,0,0,163,171,5,30,0,0,
	164,171,3,34,17,0,165,171,3,4,2,0,166,167,5,22,0,0,167,168,3,28,14,0,168,
	169,5,23,0,0,169,171,1,0,0,0,170,162,1,0,0,0,170,163,1,0,0,0,170,164,1,
	0,0,0,170,165,1,0,0,0,170,166,1,0,0,0,171,33,1,0,0,0,172,173,5,33,0,0,173,
	175,5,19,0,0,174,172,1,0,0,0,174,175,1,0,0,0,175,176,1,0,0,0,176,181,3,
	36,18,0,177,178,5,19,0,0,178,180,3,36,18,0,179,177,1,0,0,0,180,183,1,0,
	0,0,181,179,1,0,0,0,181,182,1,0,0,0,182,35,1,0,0,0,183,181,1,0,0,0,184,
	188,5,33,0,0,185,187,3,38,19,0,186,185,1,0,0,0,187,190,1,0,0,0,188,186,
	1,0,0,0,188,189,1,0,0,0,189,37,1,0,0,0,190,188,1,0,0,0,191,193,3,40,20,
	0,192,191,1,0,0,0,193,194,1,0,0,0,194,192,1,0,0,0,194,195,1,0,0,0,195,39,
	1,0,0,0,196,202,5,24,0,0,197,203,5,31,0,0,198,203,5,30,0,0,199,203,3,28,
	14,0,200,203,3,34,17,0,201,203,3,4,2,0,202,197,1,0,0,0,202,198,1,0,0,0,
	202,199,1,0,0,0,202,200,1,0,0,0,202,201,1,0,0,0,203,204,1,0,0,0,204,205,
	5,25,0,0,205,41,1,0,0,0,206,207,5,32,0,0,207,43,1,0,0,0,208,217,5,26,0,
	0,209,214,3,46,23,0,210,211,5,20,0,0,211,213,3,46,23,0,212,210,1,0,0,0,
	213,216,1,0,0,0,214,212,1,0,0,0,214,215,1,0,0,0,215,218,1,0,0,0,216,214,
	1,0,0,0,217,209,1,0,0,0,217,218,1,0,0,0,218,219,1,0,0,0,219,220,5,27,0,
	0,220,45,1,0,0,0,221,222,5,31,0,0,222,223,5,21,0,0,223,224,3,24,12,0,224,
	47,1,0,0,0,225,234,5,24,0,0,226,231,3,24,12,0,227,228,5,20,0,0,228,230,
	3,24,12,0,229,227,1,0,0,0,230,233,1,0,0,0,231,229,1,0,0,0,231,232,1,0,0,
	0,232,235,1,0,0,0,233,231,1,0,0,0,234,226,1,0,0,0,234,235,1,0,0,0,235,236,
	1,0,0,0,236,237,5,25,0,0,237,49,1,0,0,0,25,52,59,66,72,80,85,89,99,107,
	111,119,123,142,151,159,170,174,181,188,194,202,214,217,231,234];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!ottlParser.__ATN) {
			ottlParser.__ATN = new ATNDeserializer().deserialize(ottlParser._serializedATN);
		}

		return ottlParser.__ATN;
	}


	static DecisionsToDFA = ottlParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class StatementContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public editor(): EditorContext {
		return this.getTypedRuleContext(EditorContext, 0) as EditorContext;
	}
	public EOF(): TerminalNode {
		return this.getToken(ottlParser.EOF, 0);
	}
	public whereClause(): WhereClauseContext {
		return this.getTypedRuleContext(WhereClauseContext, 0) as WhereClauseContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_statement;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterStatement) {
	 		listener.enterStatement(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitStatement) {
	 		listener.exitStatement(this);
		}
	}
}


export class EditorContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LOWERCASE_IDENTIFIER(): TerminalNode {
		return this.getToken(ottlParser.LOWERCASE_IDENTIFIER, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(ottlParser.LPAREN, 0);
	}
	public RPAREN(): TerminalNode {
		return this.getToken(ottlParser.RPAREN, 0);
	}
	public arguments(): ArgumentsContext {
		return this.getTypedRuleContext(ArgumentsContext, 0) as ArgumentsContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_editor;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterEditor) {
	 		listener.enterEditor(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitEditor) {
	 		listener.exitEditor(this);
		}
	}
}


export class ConverterContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UPPERCASE_IDENTIFIER(): TerminalNode {
		return this.getToken(ottlParser.UPPERCASE_IDENTIFIER, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(ottlParser.LPAREN, 0);
	}
	public RPAREN(): TerminalNode {
		return this.getToken(ottlParser.RPAREN, 0);
	}
	public arguments(): ArgumentsContext {
		return this.getTypedRuleContext(ArgumentsContext, 0) as ArgumentsContext;
	}
	public keys_list(): KeysContext[] {
		return this.getTypedRuleContexts(KeysContext) as KeysContext[];
	}
	public keys(i: number): KeysContext {
		return this.getTypedRuleContext(KeysContext, i) as KeysContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_converter;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterConverter) {
	 		listener.enterConverter(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitConverter) {
	 		listener.exitConverter(this);
		}
	}
}


export class ArgumentsContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public argument_list(): ArgumentContext[] {
		return this.getTypedRuleContexts(ArgumentContext) as ArgumentContext[];
	}
	public argument(i: number): ArgumentContext {
		return this.getTypedRuleContext(ArgumentContext, i) as ArgumentContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(ottlParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(ottlParser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_arguments;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterArguments) {
	 		listener.enterArguments(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitArguments) {
	 		listener.exitArguments(this);
		}
	}
}


export class ArgumentContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public value(): ValueContext {
		return this.getTypedRuleContext(ValueContext, 0) as ValueContext;
	}
	public LOWERCASE_IDENTIFIER(): TerminalNode {
		return this.getToken(ottlParser.LOWERCASE_IDENTIFIER, 0);
	}
	public EQUAL(): TerminalNode {
		return this.getToken(ottlParser.EQUAL, 0);
	}
	public UPPERCASE_IDENTIFIER(): TerminalNode {
		return this.getToken(ottlParser.UPPERCASE_IDENTIFIER, 0);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_argument;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterArgument) {
	 		listener.enterArgument(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitArgument) {
	 		listener.exitArgument(this);
		}
	}
}


export class WhereClauseContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public WHERE(): TerminalNode {
		return this.getToken(ottlParser.WHERE, 0);
	}
	public booleanExpression(): BooleanExpressionContext {
		return this.getTypedRuleContext(BooleanExpressionContext, 0) as BooleanExpressionContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_whereClause;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterWhereClause) {
	 		listener.enterWhereClause(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitWhereClause) {
	 		listener.exitWhereClause(this);
		}
	}
}


export class BooleanExpressionContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public term_list(): TermContext[] {
		return this.getTypedRuleContexts(TermContext) as TermContext[];
	}
	public term(i: number): TermContext {
		return this.getTypedRuleContext(TermContext, i) as TermContext;
	}
	public OR_list(): TerminalNode[] {
	    	return this.getTokens(ottlParser.OR);
	}
	public OR(i: number): TerminalNode {
		return this.getToken(ottlParser.OR, i);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_booleanExpression;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterBooleanExpression) {
	 		listener.enterBooleanExpression(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitBooleanExpression) {
	 		listener.exitBooleanExpression(this);
		}
	}
}


export class TermContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public booleanValue_list(): BooleanValueContext[] {
		return this.getTypedRuleContexts(BooleanValueContext) as BooleanValueContext[];
	}
	public booleanValue(i: number): BooleanValueContext {
		return this.getTypedRuleContext(BooleanValueContext, i) as BooleanValueContext;
	}
	public AND_list(): TerminalNode[] {
	    	return this.getTokens(ottlParser.AND);
	}
	public AND(i: number): TerminalNode {
		return this.getToken(ottlParser.AND, i);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_term;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterTerm) {
	 		listener.enterTerm(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitTerm) {
	 		listener.exitTerm(this);
		}
	}
}


export class BooleanValueContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public comparison(): ComparisonContext {
		return this.getTypedRuleContext(ComparisonContext, 0) as ComparisonContext;
	}
	public constExpr(): ConstExprContext {
		return this.getTypedRuleContext(ConstExprContext, 0) as ConstExprContext;
	}
	public LPAREN(): TerminalNode {
		return this.getToken(ottlParser.LPAREN, 0);
	}
	public booleanExpression(): BooleanExpressionContext {
		return this.getTypedRuleContext(BooleanExpressionContext, 0) as BooleanExpressionContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(ottlParser.RPAREN, 0);
	}
	public NOT(): TerminalNode {
		return this.getToken(ottlParser.NOT, 0);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_booleanValue;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterBooleanValue) {
	 		listener.enterBooleanValue(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitBooleanValue) {
	 		listener.exitBooleanValue(this);
		}
	}
}


export class ConstExprContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public BOOLEAN(): TerminalNode {
		return this.getToken(ottlParser.BOOLEAN, 0);
	}
	public converter(): ConverterContext {
		return this.getTypedRuleContext(ConverterContext, 0) as ConverterContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_constExpr;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterConstExpr) {
	 		listener.enterConstExpr(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitConstExpr) {
	 		listener.exitConstExpr(this);
		}
	}
}


export class ComparisonContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public value_list(): ValueContext[] {
		return this.getTypedRuleContexts(ValueContext) as ValueContext[];
	}
	public value(i: number): ValueContext {
		return this.getTypedRuleContext(ValueContext, i) as ValueContext;
	}
	public comparisonOp(): ComparisonOpContext {
		return this.getTypedRuleContext(ComparisonOpContext, 0) as ComparisonOpContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_comparison;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterComparison) {
	 		listener.enterComparison(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitComparison) {
	 		listener.exitComparison(this);
		}
	}
}


export class ComparisonOpContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public EQ(): TerminalNode {
		return this.getToken(ottlParser.EQ, 0);
	}
	public NE(): TerminalNode {
		return this.getToken(ottlParser.NE, 0);
	}
	public LT(): TerminalNode {
		return this.getToken(ottlParser.LT, 0);
	}
	public LTE(): TerminalNode {
		return this.getToken(ottlParser.LTE, 0);
	}
	public GT(): TerminalNode {
		return this.getToken(ottlParser.GT, 0);
	}
	public GTE(): TerminalNode {
		return this.getToken(ottlParser.GTE, 0);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_comparisonOp;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterComparisonOp) {
	 		listener.enterComparisonOp(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitComparisonOp) {
	 		listener.exitComparisonOp(this);
		}
	}
}


export class ValueContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public NIL(): TerminalNode {
		return this.getToken(ottlParser.NIL, 0);
	}
	public literal(): LiteralContext {
		return this.getTypedRuleContext(LiteralContext, 0) as LiteralContext;
	}
	public mathExpression(): MathExpressionContext {
		return this.getTypedRuleContext(MathExpressionContext, 0) as MathExpressionContext;
	}
	public BYTES(): TerminalNode {
		return this.getToken(ottlParser.BYTES, 0);
	}
	public STRING(): TerminalNode {
		return this.getToken(ottlParser.STRING, 0);
	}
	public BOOLEAN(): TerminalNode {
		return this.getToken(ottlParser.BOOLEAN, 0);
	}
	public enumSymbol(): EnumSymbolContext {
		return this.getTypedRuleContext(EnumSymbolContext, 0) as EnumSymbolContext;
	}
	public mapValue(): MapValueContext {
		return this.getTypedRuleContext(MapValueContext, 0) as MapValueContext;
	}
	public listValue(): ListValueContext {
		return this.getTypedRuleContext(ListValueContext, 0) as ListValueContext;
	}
	public converter(): ConverterContext {
		return this.getTypedRuleContext(ConverterContext, 0) as ConverterContext;
	}
	public path(): PathContext {
		return this.getTypedRuleContext(PathContext, 0) as PathContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_value;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterValue) {
	 		listener.enterValue(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitValue) {
	 		listener.exitValue(this);
		}
	}
}


export class LiteralContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public FLOAT(): TerminalNode {
		return this.getToken(ottlParser.FLOAT, 0);
	}
	public INT(): TerminalNode {
		return this.getToken(ottlParser.INT, 0);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_literal;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterLiteral) {
	 		listener.enterLiteral(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitLiteral) {
	 		listener.exitLiteral(this);
		}
	}
}


export class MathExpressionContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public mathTerm_list(): MathTermContext[] {
		return this.getTypedRuleContexts(MathTermContext) as MathTermContext[];
	}
	public mathTerm(i: number): MathTermContext {
		return this.getTypedRuleContext(MathTermContext, i) as MathTermContext;
	}
	public PLUS_list(): TerminalNode[] {
	    	return this.getTokens(ottlParser.PLUS);
	}
	public PLUS(i: number): TerminalNode {
		return this.getToken(ottlParser.PLUS, i);
	}
	public MINUS_list(): TerminalNode[] {
	    	return this.getTokens(ottlParser.MINUS);
	}
	public MINUS(i: number): TerminalNode {
		return this.getToken(ottlParser.MINUS, i);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_mathExpression;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterMathExpression) {
	 		listener.enterMathExpression(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitMathExpression) {
	 		listener.exitMathExpression(this);
		}
	}
}


export class MathTermContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public mathFactor_list(): MathFactorContext[] {
		return this.getTypedRuleContexts(MathFactorContext) as MathFactorContext[];
	}
	public mathFactor(i: number): MathFactorContext {
		return this.getTypedRuleContext(MathFactorContext, i) as MathFactorContext;
	}
	public STAR_list(): TerminalNode[] {
	    	return this.getTokens(ottlParser.STAR);
	}
	public STAR(i: number): TerminalNode {
		return this.getToken(ottlParser.STAR, i);
	}
	public SLASH_list(): TerminalNode[] {
	    	return this.getTokens(ottlParser.SLASH);
	}
	public SLASH(i: number): TerminalNode {
		return this.getToken(ottlParser.SLASH, i);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_mathTerm;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterMathTerm) {
	 		listener.enterMathTerm(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitMathTerm) {
	 		listener.exitMathTerm(this);
		}
	}
}


export class MathFactorContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public FLOAT(): TerminalNode {
		return this.getToken(ottlParser.FLOAT, 0);
	}
	public INT(): TerminalNode {
		return this.getToken(ottlParser.INT, 0);
	}
	public path(): PathContext {
		return this.getTypedRuleContext(PathContext, 0) as PathContext;
	}
	public converter(): ConverterContext {
		return this.getTypedRuleContext(ConverterContext, 0) as ConverterContext;
	}
	public LPAREN(): TerminalNode {
		return this.getToken(ottlParser.LPAREN, 0);
	}
	public mathExpression(): MathExpressionContext {
		return this.getTypedRuleContext(MathExpressionContext, 0) as MathExpressionContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(ottlParser.RPAREN, 0);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_mathFactor;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterMathFactor) {
	 		listener.enterMathFactor(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitMathFactor) {
	 		listener.exitMathFactor(this);
		}
	}
}


export class PathContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public field_list(): FieldContext[] {
		return this.getTypedRuleContexts(FieldContext) as FieldContext[];
	}
	public field(i: number): FieldContext {
		return this.getTypedRuleContext(FieldContext, i) as FieldContext;
	}
	public LOWERCASE_IDENTIFIER(): TerminalNode {
		return this.getToken(ottlParser.LOWERCASE_IDENTIFIER, 0);
	}
	public DOT_list(): TerminalNode[] {
	    	return this.getTokens(ottlParser.DOT);
	}
	public DOT(i: number): TerminalNode {
		return this.getToken(ottlParser.DOT, i);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_path;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterPath) {
	 		listener.enterPath(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitPath) {
	 		listener.exitPath(this);
		}
	}
}


export class FieldContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LOWERCASE_IDENTIFIER(): TerminalNode {
		return this.getToken(ottlParser.LOWERCASE_IDENTIFIER, 0);
	}
	public keys_list(): KeysContext[] {
		return this.getTypedRuleContexts(KeysContext) as KeysContext[];
	}
	public keys(i: number): KeysContext {
		return this.getTypedRuleContext(KeysContext, i) as KeysContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_field;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterField) {
	 		listener.enterField(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitField) {
	 		listener.exitField(this);
		}
	}
}


export class KeysContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public key_list(): KeyContext[] {
		return this.getTypedRuleContexts(KeyContext) as KeyContext[];
	}
	public key(i: number): KeyContext {
		return this.getTypedRuleContext(KeyContext, i) as KeyContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_keys;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterKeys) {
	 		listener.enterKeys(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitKeys) {
	 		listener.exitKeys(this);
		}
	}
}


export class KeyContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LBRACK(): TerminalNode {
		return this.getToken(ottlParser.LBRACK, 0);
	}
	public RBRACK(): TerminalNode {
		return this.getToken(ottlParser.RBRACK, 0);
	}
	public STRING(): TerminalNode {
		return this.getToken(ottlParser.STRING, 0);
	}
	public INT(): TerminalNode {
		return this.getToken(ottlParser.INT, 0);
	}
	public mathExpression(): MathExpressionContext {
		return this.getTypedRuleContext(MathExpressionContext, 0) as MathExpressionContext;
	}
	public path(): PathContext {
		return this.getTypedRuleContext(PathContext, 0) as PathContext;
	}
	public converter(): ConverterContext {
		return this.getTypedRuleContext(ConverterContext, 0) as ConverterContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_key;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterKey) {
	 		listener.enterKey(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitKey) {
	 		listener.exitKey(this);
		}
	}
}


export class EnumSymbolContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public UPPERCASE_IDENTIFIER(): TerminalNode {
		return this.getToken(ottlParser.UPPERCASE_IDENTIFIER, 0);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_enumSymbol;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterEnumSymbol) {
	 		listener.enterEnumSymbol(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitEnumSymbol) {
	 		listener.exitEnumSymbol(this);
		}
	}
}


export class MapValueContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LBRACE(): TerminalNode {
		return this.getToken(ottlParser.LBRACE, 0);
	}
	public RBRACE(): TerminalNode {
		return this.getToken(ottlParser.RBRACE, 0);
	}
	public mapItem_list(): MapItemContext[] {
		return this.getTypedRuleContexts(MapItemContext) as MapItemContext[];
	}
	public mapItem(i: number): MapItemContext {
		return this.getTypedRuleContext(MapItemContext, i) as MapItemContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(ottlParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(ottlParser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_mapValue;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterMapValue) {
	 		listener.enterMapValue(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitMapValue) {
	 		listener.exitMapValue(this);
		}
	}
}


export class MapItemContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public STRING(): TerminalNode {
		return this.getToken(ottlParser.STRING, 0);
	}
	public COLON(): TerminalNode {
		return this.getToken(ottlParser.COLON, 0);
	}
	public value(): ValueContext {
		return this.getTypedRuleContext(ValueContext, 0) as ValueContext;
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_mapItem;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterMapItem) {
	 		listener.enterMapItem(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitMapItem) {
	 		listener.exitMapItem(this);
		}
	}
}


export class ListValueContext extends ParserRuleContext {
	constructor(parser?: ottlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LBRACK(): TerminalNode {
		return this.getToken(ottlParser.LBRACK, 0);
	}
	public RBRACK(): TerminalNode {
		return this.getToken(ottlParser.RBRACK, 0);
	}
	public value_list(): ValueContext[] {
		return this.getTypedRuleContexts(ValueContext) as ValueContext[];
	}
	public value(i: number): ValueContext {
		return this.getTypedRuleContext(ValueContext, i) as ValueContext;
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(ottlParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(ottlParser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return ottlParser.RULE_listValue;
	}
	public enterRule(listener: ottlListener): void {
	    if(listener.enterListValue) {
	 		listener.enterListValue(this);
		}
	}
	public exitRule(listener: ottlListener): void {
	    if(listener.exitListValue) {
	 		listener.exitListValue(this);
		}
	}
}
