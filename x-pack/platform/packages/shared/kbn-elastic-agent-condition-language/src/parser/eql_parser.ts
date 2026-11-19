/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-nocheck
// Generated from Eql.g4 by ANTLR 4.13.2
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
import EqlListener from "./eql_listener.js";
import EqlVisitor from "./eql_visitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class EqlParser extends Parser {
	public static readonly T__0 = 1;
	public static readonly T__1 = 2;
	public static readonly T__2 = 3;
	public static readonly EQ = 4;
	public static readonly NEQ = 5;
	public static readonly GT = 6;
	public static readonly LT = 7;
	public static readonly GTE = 8;
	public static readonly LTE = 9;
	public static readonly ADD = 10;
	public static readonly SUB = 11;
	public static readonly MUL = 12;
	public static readonly DIV = 13;
	public static readonly MOD = 14;
	public static readonly AND = 15;
	public static readonly OR = 16;
	public static readonly TRUE = 17;
	public static readonly FALSE = 18;
	public static readonly FLOAT = 19;
	public static readonly NUMBER = 20;
	public static readonly WHITESPACE = 21;
	public static readonly NOT = 22;
	public static readonly NAME = 23;
	public static readonly VNAME = 24;
	public static readonly STEXT = 25;
	public static readonly DTEXT = 26;
	public static readonly LPAR = 27;
	public static readonly RPAR = 28;
	public static readonly LARR = 29;
	public static readonly RARR = 30;
	public static readonly LDICT = 31;
	public static readonly RDICT = 32;
	public static readonly BEGIN_EVARIABLE = 33;
	public static readonly BEGIN_VARIABLE = 34;
	public static override readonly EOF = Token.EOF;
	public static readonly RULE_expList = 0;
	public static readonly RULE_boolean = 1;
	public static readonly RULE_constant = 2;
	public static readonly RULE_variable = 3;
	public static readonly RULE_variableExp = 4;
	public static readonly RULE_exp = 5;
	public static readonly RULE_arguments = 6;
	public static readonly RULE_array = 7;
	public static readonly RULE_key = 8;
	public static readonly RULE_dict = 9;
	public static readonly literalNames: (string | null)[] = [ null, "'|'", 
                                                            "','", "':'", 
                                                            "'=='", "'!='", 
                                                            "'>'", "'<'", 
                                                            "'>='", "'<='", 
                                                            "'+'", "'-'", 
                                                            "'*'", "'/'", 
                                                            "'%'", null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            null, "'('", 
                                                            "')'", "'['", 
                                                            "']'", "'{'", 
                                                            "'}'", "'$${'", 
                                                            "'${'" ];
	public static readonly symbolicNames: (string | null)[] = [ null, null, 
                                                             null, null, 
                                                             "EQ", "NEQ", 
                                                             "GT", "LT", 
                                                             "GTE", "LTE", 
                                                             "ADD", "SUB", 
                                                             "MUL", "DIV", 
                                                             "MOD", "AND", 
                                                             "OR", "TRUE", 
                                                             "FALSE", "FLOAT", 
                                                             "NUMBER", "WHITESPACE", 
                                                             "NOT", "NAME", 
                                                             "VNAME", "STEXT", 
                                                             "DTEXT", "LPAR", 
                                                             "RPAR", "LARR", 
                                                             "RARR", "LDICT", 
                                                             "RDICT", "BEGIN_EVARIABLE", 
                                                             "BEGIN_VARIABLE" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"expList", "boolean", "constant", "variable", "variableExp", "exp", "arguments", 
		"array", "key", "dict",
	];
	public get grammarFileName(): string { return "Eql.g4"; }
	public get literalNames(): (string | null)[] { return EqlParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return EqlParser.symbolicNames; }
	public get ruleNames(): string[] { return EqlParser.ruleNames; }
	public get serializedATN(): number[] { return EqlParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, EqlParser._ATN, EqlParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public expList(): ExpListContext {
		let localctx: ExpListContext = new ExpListContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, EqlParser.RULE_expList);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 20;
			this.exp(0);
			this.state = 21;
			this.match(EqlParser.EOF);
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
	public boolean_(): BooleanContext {
		let localctx: BooleanContext = new BooleanContext(this, this._ctx, this.state);
		this.enterRule(localctx, 2, EqlParser.RULE_boolean);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 23;
			_la = this._input.LA(1);
			if(!(_la===17 || _la===18)) {
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
	public constant(): ConstantContext {
		let localctx: ConstantContext = new ConstantContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, EqlParser.RULE_constant);
		try {
			this.state = 30;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 25:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 25;
				this.match(EqlParser.STEXT);
				}
				break;
			case 26:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 26;
				this.match(EqlParser.DTEXT);
				}
				break;
			case 19:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 27;
				this.match(EqlParser.FLOAT);
				}
				break;
			case 20:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 28;
				this.match(EqlParser.NUMBER);
				}
				break;
			case 17:
			case 18:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 29;
				this.boolean_();
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
	public variable(): VariableContext {
		let localctx: VariableContext = new VariableContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, EqlParser.RULE_variable);
		try {
			this.state = 35;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 23:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 32;
				this.match(EqlParser.NAME);
				}
				break;
			case 24:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 33;
				this.match(EqlParser.VNAME);
				}
				break;
			case 17:
			case 18:
			case 19:
			case 20:
			case 25:
			case 26:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 34;
				this.constant();
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
	public variableExp(): VariableExpContext {
		let localctx: VariableExpContext = new VariableExpContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, EqlParser.RULE_variableExp);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 37;
			this.variable();
			this.state = 42;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===1) {
				{
				{
				this.state = 38;
				this.match(EqlParser.T__0);
				this.state = 39;
				this.variable();
				}
				}
				this.state = 44;
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

	public exp(): ExpContext;
	public exp(_p: number): ExpContext;
	// @RuleVersion(0)
	public exp(_p?: number): ExpContext {
		if (_p === undefined) {
			_p = 0;
		}

		let _parentctx: ParserRuleContext = this._ctx;
		let _parentState: number = this.state;
		let localctx: ExpContext = new ExpContext(this, this._ctx, _parentState);
		let _prevctx: ExpContext = localctx;
		let _startState: number = 10;
		this.enterRecursionRule(localctx, 10, EqlParser.RULE_exp, _p);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 80;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 27:
				{
				localctx = new ExpInParenContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;

				this.state = 46;
				this.match(EqlParser.LPAR);
				this.state = 47;
				this.exp(0);
				this.state = 48;
				this.match(EqlParser.RPAR);
				}
				break;
			case 22:
				{
				localctx = new ExpNotContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 50;
				this.match(EqlParser.NOT);
				this.state = 51;
				this.exp(18);
				}
				break;
			case 17:
			case 18:
				{
				localctx = new ExpBooleanContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 52;
				this.boolean_();
				}
				break;
			case 33:
				{
				localctx = new ExpEVariableContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 53;
				this.match(EqlParser.BEGIN_EVARIABLE);
				this.state = 54;
				this.variableExp();
				this.state = 55;
				this.match(EqlParser.RDICT);
				}
				break;
			case 34:
				{
				localctx = new ExpVariableContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 57;
				this.match(EqlParser.BEGIN_VARIABLE);
				this.state = 58;
				this.variableExp();
				this.state = 59;
				this.match(EqlParser.RDICT);
				}
				break;
			case 23:
				{
				localctx = new ExpFunctionContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 61;
				this.match(EqlParser.NAME);
				this.state = 62;
				this.match(EqlParser.LPAR);
				this.state = 64;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (((((_la - 17)) & ~0x1F) === 0 && ((1 << (_la - 17)) & 218991) !== 0)) {
					{
					this.state = 63;
					this.arguments();
					}
				}

				this.state = 66;
				this.match(EqlParser.RPAR);
				}
				break;
			case 29:
				{
				localctx = new ExpArrayContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 67;
				this.match(EqlParser.LARR);
				this.state = 69;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 102629376) !== 0)) {
					{
					this.state = 68;
					this.array();
					}
				}

				this.state = 71;
				this.match(EqlParser.RARR);
				}
				break;
			case 31:
				{
				localctx = new ExpDictContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 72;
				this.match(EqlParser.LDICT);
				this.state = 74;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 109051904) !== 0)) {
					{
					this.state = 73;
					this.dict();
					}
				}

				this.state = 76;
				this.match(EqlParser.RDICT);
				}
				break;
			case 25:
			case 26:
				{
				localctx = new ExpTextContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 77;
				_la = this._input.LA(1);
				if(!(_la===25 || _la===26)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				}
				break;
			case 19:
				{
				localctx = new ExpFloatContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 78;
				this.match(EqlParser.FLOAT);
				}
				break;
			case 20:
				{
				localctx = new ExpNumberContext(this, localctx);
				this._ctx = localctx;
				_prevctx = localctx;
				this.state = 79;
				this.match(EqlParser.NUMBER);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this._ctx.stop = this._input.LT(-1);
			this.state = 114;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					if (this._parseListeners != null) {
						this.triggerExitRuleEvent();
					}
					_prevctx = localctx;
					{
					this.state = 112;
					this._errHandler.sync(this);
					switch ( this._interp.adaptivePredict(this._input, 7, this._ctx) ) {
					case 1:
						{
						localctx = new ExpArithmeticMulDivModContext(this, new ExpContext(this, _parentctx, _parentState));
						(localctx as ExpArithmeticMulDivModContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, EqlParser.RULE_exp);
						this.state = 82;
						if (!(this.precpred(this._ctx, 20))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 20)");
						}
						this.state = 83;
						_la = this._input.LA(1);
						if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 28672) !== 0))) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 84;
						(localctx as ExpArithmeticMulDivModContext)._right = this.exp(21);
						}
						break;
					case 2:
						{
						localctx = new ExpArithmeticAddSubContext(this, new ExpContext(this, _parentctx, _parentState));
						(localctx as ExpArithmeticAddSubContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, EqlParser.RULE_exp);
						this.state = 85;
						if (!(this.precpred(this._ctx, 19))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 19)");
						}
						this.state = 86;
						_la = this._input.LA(1);
						if(!(_la===10 || _la===11)) {
						this._errHandler.recoverInline(this);
						}
						else {
							this._errHandler.reportMatch(this);
						    this.consume();
						}
						this.state = 87;
						(localctx as ExpArithmeticAddSubContext)._right = this.exp(20);
						}
						break;
					case 3:
						{
						localctx = new ExpArithmeticEQContext(this, new ExpContext(this, _parentctx, _parentState));
						(localctx as ExpArithmeticEQContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, EqlParser.RULE_exp);
						this.state = 88;
						if (!(this.precpred(this._ctx, 17))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 17)");
						}
						this.state = 89;
						this.match(EqlParser.EQ);
						this.state = 90;
						(localctx as ExpArithmeticEQContext)._right = this.exp(18);
						}
						break;
					case 4:
						{
						localctx = new ExpArithmeticNEQContext(this, new ExpContext(this, _parentctx, _parentState));
						(localctx as ExpArithmeticNEQContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, EqlParser.RULE_exp);
						this.state = 91;
						if (!(this.precpred(this._ctx, 16))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 16)");
						}
						this.state = 92;
						this.match(EqlParser.NEQ);
						this.state = 93;
						(localctx as ExpArithmeticNEQContext)._right = this.exp(17);
						}
						break;
					case 5:
						{
						localctx = new ExpArithmeticLTEContext(this, new ExpContext(this, _parentctx, _parentState));
						(localctx as ExpArithmeticLTEContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, EqlParser.RULE_exp);
						this.state = 94;
						if (!(this.precpred(this._ctx, 15))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 15)");
						}
						this.state = 95;
						this.match(EqlParser.LTE);
						this.state = 96;
						(localctx as ExpArithmeticLTEContext)._right = this.exp(16);
						}
						break;
					case 6:
						{
						localctx = new ExpArithmeticGTEContext(this, new ExpContext(this, _parentctx, _parentState));
						(localctx as ExpArithmeticGTEContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, EqlParser.RULE_exp);
						this.state = 97;
						if (!(this.precpred(this._ctx, 14))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 14)");
						}
						this.state = 98;
						this.match(EqlParser.GTE);
						this.state = 99;
						(localctx as ExpArithmeticGTEContext)._right = this.exp(15);
						}
						break;
					case 7:
						{
						localctx = new ExpArithmeticLTContext(this, new ExpContext(this, _parentctx, _parentState));
						(localctx as ExpArithmeticLTContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, EqlParser.RULE_exp);
						this.state = 100;
						if (!(this.precpred(this._ctx, 13))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 13)");
						}
						this.state = 101;
						this.match(EqlParser.LT);
						this.state = 102;
						(localctx as ExpArithmeticLTContext)._right = this.exp(14);
						}
						break;
					case 8:
						{
						localctx = new ExpArithmeticGTContext(this, new ExpContext(this, _parentctx, _parentState));
						(localctx as ExpArithmeticGTContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, EqlParser.RULE_exp);
						this.state = 103;
						if (!(this.precpred(this._ctx, 12))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 12)");
						}
						this.state = 104;
						this.match(EqlParser.GT);
						this.state = 105;
						(localctx as ExpArithmeticGTContext)._right = this.exp(13);
						}
						break;
					case 9:
						{
						localctx = new ExpLogicalAndContext(this, new ExpContext(this, _parentctx, _parentState));
						(localctx as ExpLogicalAndContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, EqlParser.RULE_exp);
						this.state = 106;
						if (!(this.precpred(this._ctx, 11))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 11)");
						}
						this.state = 107;
						this.match(EqlParser.AND);
						this.state = 108;
						(localctx as ExpLogicalAndContext)._right = this.exp(12);
						}
						break;
					case 10:
						{
						localctx = new ExpLogicalORContext(this, new ExpContext(this, _parentctx, _parentState));
						(localctx as ExpLogicalORContext)._left = _prevctx;
						this.pushNewRecursionContext(localctx, _startState, EqlParser.RULE_exp);
						this.state = 109;
						if (!(this.precpred(this._ctx, 10))) {
							throw this.createFailedPredicateException("this.precpred(this._ctx, 10)");
						}
						this.state = 110;
						this.match(EqlParser.OR);
						this.state = 111;
						(localctx as ExpLogicalORContext)._right = this.exp(11);
						}
						break;
					}
					}
				}
				this.state = 116;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 8, this._ctx);
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
			this.unrollRecursionContexts(_parentctx);
		}
		return localctx;
	}
	// @RuleVersion(0)
	public arguments(): ArgumentsContext {
		let localctx: ArgumentsContext = new ArgumentsContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, EqlParser.RULE_arguments);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 117;
			this.exp(0);
			this.state = 122;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===2) {
				{
				{
				this.state = 118;
				this.match(EqlParser.T__1);
				this.state = 119;
				this.exp(0);
				}
				}
				this.state = 124;
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
	public array(): ArrayContext {
		let localctx: ArrayContext = new ArrayContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, EqlParser.RULE_array);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 125;
			this.constant();
			this.state = 130;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===2) {
				{
				{
				this.state = 126;
				this.match(EqlParser.T__1);
				this.state = 127;
				this.constant();
				}
				}
				this.state = 132;
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
	public key(): KeyContext {
		let localctx: KeyContext = new KeyContext(this, this._ctx, this.state);
		this.enterRule(localctx, 16, EqlParser.RULE_key);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 133;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 109051904) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			this.state = 134;
			this.match(EqlParser.T__2);
			this.state = 135;
			this.constant();
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
	public dict(): DictContext {
		let localctx: DictContext = new DictContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, EqlParser.RULE_dict);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 137;
			this.key();
			this.state = 142;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===2) {
				{
				{
				this.state = 138;
				this.match(EqlParser.T__1);
				this.state = 139;
				this.key();
				}
				}
				this.state = 144;
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

	public sempred(localctx: RuleContext, ruleIndex: number, predIndex: number): boolean {
		switch (ruleIndex) {
		case 5:
			return this.exp_sempred(localctx as ExpContext, predIndex);
		}
		return true;
	}
	private exp_sempred(localctx: ExpContext, predIndex: number): boolean {
		switch (predIndex) {
		case 0:
			return this.precpred(this._ctx, 20);
		case 1:
			return this.precpred(this._ctx, 19);
		case 2:
			return this.precpred(this._ctx, 17);
		case 3:
			return this.precpred(this._ctx, 16);
		case 4:
			return this.precpred(this._ctx, 15);
		case 5:
			return this.precpred(this._ctx, 14);
		case 6:
			return this.precpred(this._ctx, 13);
		case 7:
			return this.precpred(this._ctx, 12);
		case 8:
			return this.precpred(this._ctx, 11);
		case 9:
			return this.precpred(this._ctx, 10);
		}
		return true;
	}

	public static readonly _serializedATN: number[] = [4,1,34,146,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,1,
	0,1,0,1,0,1,1,1,1,1,2,1,2,1,2,1,2,1,2,3,2,31,8,2,1,3,1,3,1,3,3,3,36,8,3,
	1,4,1,4,1,4,5,4,41,8,4,10,4,12,4,44,9,4,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,
	1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,3,5,65,8,5,1,5,1,5,1,5,3,5,
	70,8,5,1,5,1,5,1,5,3,5,75,8,5,1,5,1,5,1,5,1,5,3,5,81,8,5,1,5,1,5,1,5,1,
	5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,
	5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,1,5,5,5,113,8,5,10,5,12,5,116,9,5,1,6,1,6,
	1,6,5,6,121,8,6,10,6,12,6,124,9,6,1,7,1,7,1,7,5,7,129,8,7,10,7,12,7,132,
	9,7,1,8,1,8,1,8,1,8,1,9,1,9,1,9,5,9,141,8,9,10,9,12,9,144,9,9,1,9,0,1,10,
	10,0,2,4,6,8,10,12,14,16,18,0,5,1,0,17,18,1,0,25,26,1,0,12,14,1,0,10,11,
	2,0,23,23,25,26,168,0,20,1,0,0,0,2,23,1,0,0,0,4,30,1,0,0,0,6,35,1,0,0,0,
	8,37,1,0,0,0,10,80,1,0,0,0,12,117,1,0,0,0,14,125,1,0,0,0,16,133,1,0,0,0,
	18,137,1,0,0,0,20,21,3,10,5,0,21,22,5,0,0,1,22,1,1,0,0,0,23,24,7,0,0,0,
	24,3,1,0,0,0,25,31,5,25,0,0,26,31,5,26,0,0,27,31,5,19,0,0,28,31,5,20,0,
	0,29,31,3,2,1,0,30,25,1,0,0,0,30,26,1,0,0,0,30,27,1,0,0,0,30,28,1,0,0,0,
	30,29,1,0,0,0,31,5,1,0,0,0,32,36,5,23,0,0,33,36,5,24,0,0,34,36,3,4,2,0,
	35,32,1,0,0,0,35,33,1,0,0,0,35,34,1,0,0,0,36,7,1,0,0,0,37,42,3,6,3,0,38,
	39,5,1,0,0,39,41,3,6,3,0,40,38,1,0,0,0,41,44,1,0,0,0,42,40,1,0,0,0,42,43,
	1,0,0,0,43,9,1,0,0,0,44,42,1,0,0,0,45,46,6,5,-1,0,46,47,5,27,0,0,47,48,
	3,10,5,0,48,49,5,28,0,0,49,81,1,0,0,0,50,51,5,22,0,0,51,81,3,10,5,18,52,
	81,3,2,1,0,53,54,5,33,0,0,54,55,3,8,4,0,55,56,5,32,0,0,56,81,1,0,0,0,57,
	58,5,34,0,0,58,59,3,8,4,0,59,60,5,32,0,0,60,81,1,0,0,0,61,62,5,23,0,0,62,
	64,5,27,0,0,63,65,3,12,6,0,64,63,1,0,0,0,64,65,1,0,0,0,65,66,1,0,0,0,66,
	81,5,28,0,0,67,69,5,29,0,0,68,70,3,14,7,0,69,68,1,0,0,0,69,70,1,0,0,0,70,
	71,1,0,0,0,71,81,5,30,0,0,72,74,5,31,0,0,73,75,3,18,9,0,74,73,1,0,0,0,74,
	75,1,0,0,0,75,76,1,0,0,0,76,81,5,32,0,0,77,81,7,1,0,0,78,81,5,19,0,0,79,
	81,5,20,0,0,80,45,1,0,0,0,80,50,1,0,0,0,80,52,1,0,0,0,80,53,1,0,0,0,80,
	57,1,0,0,0,80,61,1,0,0,0,80,67,1,0,0,0,80,72,1,0,0,0,80,77,1,0,0,0,80,78,
	1,0,0,0,80,79,1,0,0,0,81,114,1,0,0,0,82,83,10,20,0,0,83,84,7,2,0,0,84,113,
	3,10,5,21,85,86,10,19,0,0,86,87,7,3,0,0,87,113,3,10,5,20,88,89,10,17,0,
	0,89,90,5,4,0,0,90,113,3,10,5,18,91,92,10,16,0,0,92,93,5,5,0,0,93,113,3,
	10,5,17,94,95,10,15,0,0,95,96,5,9,0,0,96,113,3,10,5,16,97,98,10,14,0,0,
	98,99,5,8,0,0,99,113,3,10,5,15,100,101,10,13,0,0,101,102,5,7,0,0,102,113,
	3,10,5,14,103,104,10,12,0,0,104,105,5,6,0,0,105,113,3,10,5,13,106,107,10,
	11,0,0,107,108,5,15,0,0,108,113,3,10,5,12,109,110,10,10,0,0,110,111,5,16,
	0,0,111,113,3,10,5,11,112,82,1,0,0,0,112,85,1,0,0,0,112,88,1,0,0,0,112,
	91,1,0,0,0,112,94,1,0,0,0,112,97,1,0,0,0,112,100,1,0,0,0,112,103,1,0,0,
	0,112,106,1,0,0,0,112,109,1,0,0,0,113,116,1,0,0,0,114,112,1,0,0,0,114,115,
	1,0,0,0,115,11,1,0,0,0,116,114,1,0,0,0,117,122,3,10,5,0,118,119,5,2,0,0,
	119,121,3,10,5,0,120,118,1,0,0,0,121,124,1,0,0,0,122,120,1,0,0,0,122,123,
	1,0,0,0,123,13,1,0,0,0,124,122,1,0,0,0,125,130,3,4,2,0,126,127,5,2,0,0,
	127,129,3,4,2,0,128,126,1,0,0,0,129,132,1,0,0,0,130,128,1,0,0,0,130,131,
	1,0,0,0,131,15,1,0,0,0,132,130,1,0,0,0,133,134,7,4,0,0,134,135,5,3,0,0,
	135,136,3,4,2,0,136,17,1,0,0,0,137,142,3,16,8,0,138,139,5,2,0,0,139,141,
	3,16,8,0,140,138,1,0,0,0,141,144,1,0,0,0,142,140,1,0,0,0,142,143,1,0,0,
	0,143,19,1,0,0,0,144,142,1,0,0,0,12,30,35,42,64,69,74,80,112,114,122,130,
	142];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!EqlParser.__ATN) {
			EqlParser.__ATN = new ATNDeserializer().deserialize(EqlParser._serializedATN);
		}

		return EqlParser.__ATN;
	}


	static DecisionsToDFA = EqlParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class ExpListContext extends ParserRuleContext {
	constructor(parser?: EqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public exp(): ExpContext {
		return this.getTypedRuleContext(ExpContext, 0) as ExpContext;
	}
	public EOF(): TerminalNode {
		return this.getToken(EqlParser.EOF, 0);
	}
    public get ruleIndex(): number {
    	return EqlParser.RULE_expList;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpList) {
	 		listener.enterExpList(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpList) {
	 		listener.exitExpList(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpList) {
			return visitor.visitExpList(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class BooleanContext extends ParserRuleContext {
	constructor(parser?: EqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public TRUE(): TerminalNode {
		return this.getToken(EqlParser.TRUE, 0);
	}
	public FALSE(): TerminalNode {
		return this.getToken(EqlParser.FALSE, 0);
	}
    public get ruleIndex(): number {
    	return EqlParser.RULE_boolean;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterBoolean) {
	 		listener.enterBoolean(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitBoolean) {
	 		listener.exitBoolean(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitBoolean) {
			return visitor.visitBoolean(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ConstantContext extends ParserRuleContext {
	constructor(parser?: EqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public STEXT(): TerminalNode {
		return this.getToken(EqlParser.STEXT, 0);
	}
	public DTEXT(): TerminalNode {
		return this.getToken(EqlParser.DTEXT, 0);
	}
	public FLOAT(): TerminalNode {
		return this.getToken(EqlParser.FLOAT, 0);
	}
	public NUMBER(): TerminalNode {
		return this.getToken(EqlParser.NUMBER, 0);
	}
	public boolean_(): BooleanContext {
		return this.getTypedRuleContext(BooleanContext, 0) as BooleanContext;
	}
    public get ruleIndex(): number {
    	return EqlParser.RULE_constant;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterConstant) {
	 		listener.enterConstant(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitConstant) {
	 		listener.exitConstant(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitConstant) {
			return visitor.visitConstant(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class VariableContext extends ParserRuleContext {
	constructor(parser?: EqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public NAME(): TerminalNode {
		return this.getToken(EqlParser.NAME, 0);
	}
	public VNAME(): TerminalNode {
		return this.getToken(EqlParser.VNAME, 0);
	}
	public constant(): ConstantContext {
		return this.getTypedRuleContext(ConstantContext, 0) as ConstantContext;
	}
    public get ruleIndex(): number {
    	return EqlParser.RULE_variable;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterVariable) {
	 		listener.enterVariable(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitVariable) {
	 		listener.exitVariable(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitVariable) {
			return visitor.visitVariable(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class VariableExpContext extends ParserRuleContext {
	constructor(parser?: EqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public variable_list(): VariableContext[] {
		return this.getTypedRuleContexts(VariableContext) as VariableContext[];
	}
	public variable(i: number): VariableContext {
		return this.getTypedRuleContext(VariableContext, i) as VariableContext;
	}
    public get ruleIndex(): number {
    	return EqlParser.RULE_variableExp;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterVariableExp) {
	 		listener.enterVariableExp(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitVariableExp) {
	 		listener.exitVariableExp(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitVariableExp) {
			return visitor.visitVariableExp(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ExpContext extends ParserRuleContext {
	constructor(parser?: EqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return EqlParser.RULE_exp;
	}
	public override copyFrom(ctx: ExpContext): void {
		super.copyFrom(ctx);
	}
}
export class ExpArithmeticNEQContext extends ExpContext {
	public _left!: ExpContext;
	public _right!: ExpContext;
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NEQ(): TerminalNode {
		return this.getToken(EqlParser.NEQ, 0);
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpArithmeticNEQ) {
	 		listener.enterExpArithmeticNEQ(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpArithmeticNEQ) {
	 		listener.exitExpArithmeticNEQ(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpArithmeticNEQ) {
			return visitor.visitExpArithmeticNEQ(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpEVariableContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public BEGIN_EVARIABLE(): TerminalNode {
		return this.getToken(EqlParser.BEGIN_EVARIABLE, 0);
	}
	public variableExp(): VariableExpContext {
		return this.getTypedRuleContext(VariableExpContext, 0) as VariableExpContext;
	}
	public RDICT(): TerminalNode {
		return this.getToken(EqlParser.RDICT, 0);
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpEVariable) {
	 		listener.enterExpEVariable(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpEVariable) {
	 		listener.exitExpEVariable(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpEVariable) {
			return visitor.visitExpEVariable(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpArithmeticEQContext extends ExpContext {
	public _left!: ExpContext;
	public _right!: ExpContext;
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public EQ(): TerminalNode {
		return this.getToken(EqlParser.EQ, 0);
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpArithmeticEQ) {
	 		listener.enterExpArithmeticEQ(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpArithmeticEQ) {
	 		listener.exitExpArithmeticEQ(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpArithmeticEQ) {
			return visitor.visitExpArithmeticEQ(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpArithmeticGTEContext extends ExpContext {
	public _left!: ExpContext;
	public _right!: ExpContext;
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public GTE(): TerminalNode {
		return this.getToken(EqlParser.GTE, 0);
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpArithmeticGTE) {
	 		listener.enterExpArithmeticGTE(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpArithmeticGTE) {
	 		listener.exitExpArithmeticGTE(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpArithmeticGTE) {
			return visitor.visitExpArithmeticGTE(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpArithmeticLTEContext extends ExpContext {
	public _left!: ExpContext;
	public _right!: ExpContext;
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LTE(): TerminalNode {
		return this.getToken(EqlParser.LTE, 0);
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpArithmeticLTE) {
	 		listener.enterExpArithmeticLTE(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpArithmeticLTE) {
	 		listener.exitExpArithmeticLTE(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpArithmeticLTE) {
			return visitor.visitExpArithmeticLTE(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpArithmeticGTContext extends ExpContext {
	public _left!: ExpContext;
	public _right!: ExpContext;
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public GT(): TerminalNode {
		return this.getToken(EqlParser.GT, 0);
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpArithmeticGT) {
	 		listener.enterExpArithmeticGT(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpArithmeticGT) {
	 		listener.exitExpArithmeticGT(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpArithmeticGT) {
			return visitor.visitExpArithmeticGT(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpArithmeticMulDivModContext extends ExpContext {
	public _left!: ExpContext;
	public _right!: ExpContext;
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
	public MUL(): TerminalNode {
		return this.getToken(EqlParser.MUL, 0);
	}
	public DIV(): TerminalNode {
		return this.getToken(EqlParser.DIV, 0);
	}
	public MOD(): TerminalNode {
		return this.getToken(EqlParser.MOD, 0);
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpArithmeticMulDivMod) {
	 		listener.enterExpArithmeticMulDivMod(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpArithmeticMulDivMod) {
	 		listener.exitExpArithmeticMulDivMod(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpArithmeticMulDivMod) {
			return visitor.visitExpArithmeticMulDivMod(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpDictContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LDICT(): TerminalNode {
		return this.getToken(EqlParser.LDICT, 0);
	}
	public RDICT(): TerminalNode {
		return this.getToken(EqlParser.RDICT, 0);
	}
	public dict(): DictContext {
		return this.getTypedRuleContext(DictContext, 0) as DictContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpDict) {
	 		listener.enterExpDict(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpDict) {
	 		listener.exitExpDict(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpDict) {
			return visitor.visitExpDict(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpTextContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public STEXT(): TerminalNode {
		return this.getToken(EqlParser.STEXT, 0);
	}
	public DTEXT(): TerminalNode {
		return this.getToken(EqlParser.DTEXT, 0);
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpText) {
	 		listener.enterExpText(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpText) {
	 		listener.exitExpText(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpText) {
			return visitor.visitExpText(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpNumberContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NUMBER(): TerminalNode {
		return this.getToken(EqlParser.NUMBER, 0);
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpNumber) {
	 		listener.enterExpNumber(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpNumber) {
	 		listener.exitExpNumber(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpNumber) {
			return visitor.visitExpNumber(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpLogicalAndContext extends ExpContext {
	public _left!: ExpContext;
	public _right!: ExpContext;
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public AND(): TerminalNode {
		return this.getToken(EqlParser.AND, 0);
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpLogicalAnd) {
	 		listener.enterExpLogicalAnd(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpLogicalAnd) {
	 		listener.exitExpLogicalAnd(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpLogicalAnd) {
			return visitor.visitExpLogicalAnd(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpLogicalORContext extends ExpContext {
	public _left!: ExpContext;
	public _right!: ExpContext;
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public OR(): TerminalNode {
		return this.getToken(EqlParser.OR, 0);
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpLogicalOR) {
	 		listener.enterExpLogicalOR(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpLogicalOR) {
	 		listener.exitExpLogicalOR(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpLogicalOR) {
			return visitor.visitExpLogicalOR(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpFloatContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public FLOAT(): TerminalNode {
		return this.getToken(EqlParser.FLOAT, 0);
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpFloat) {
	 		listener.enterExpFloat(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpFloat) {
	 		listener.exitExpFloat(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpFloat) {
			return visitor.visitExpFloat(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpVariableContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public BEGIN_VARIABLE(): TerminalNode {
		return this.getToken(EqlParser.BEGIN_VARIABLE, 0);
	}
	public variableExp(): VariableExpContext {
		return this.getTypedRuleContext(VariableExpContext, 0) as VariableExpContext;
	}
	public RDICT(): TerminalNode {
		return this.getToken(EqlParser.RDICT, 0);
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpVariable) {
	 		listener.enterExpVariable(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpVariable) {
	 		listener.exitExpVariable(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpVariable) {
			return visitor.visitExpVariable(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpArrayContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LARR(): TerminalNode {
		return this.getToken(EqlParser.LARR, 0);
	}
	public RARR(): TerminalNode {
		return this.getToken(EqlParser.RARR, 0);
	}
	public array(): ArrayContext {
		return this.getTypedRuleContext(ArrayContext, 0) as ArrayContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpArray) {
	 		listener.enterExpArray(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpArray) {
	 		listener.exitExpArray(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpArray) {
			return visitor.visitExpArray(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpNotContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NOT(): TerminalNode {
		return this.getToken(EqlParser.NOT, 0);
	}
	public exp(): ExpContext {
		return this.getTypedRuleContext(ExpContext, 0) as ExpContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpNot) {
	 		listener.enterExpNot(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpNot) {
	 		listener.exitExpNot(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpNot) {
			return visitor.visitExpNot(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpInParenContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LPAR(): TerminalNode {
		return this.getToken(EqlParser.LPAR, 0);
	}
	public exp(): ExpContext {
		return this.getTypedRuleContext(ExpContext, 0) as ExpContext;
	}
	public RPAR(): TerminalNode {
		return this.getToken(EqlParser.RPAR, 0);
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpInParen) {
	 		listener.enterExpInParen(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpInParen) {
	 		listener.exitExpInParen(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpInParen) {
			return visitor.visitExpInParen(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpBooleanContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public boolean_(): BooleanContext {
		return this.getTypedRuleContext(BooleanContext, 0) as BooleanContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpBoolean) {
	 		listener.enterExpBoolean(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpBoolean) {
	 		listener.exitExpBoolean(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpBoolean) {
			return visitor.visitExpBoolean(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpArithmeticAddSubContext extends ExpContext {
	public _left!: ExpContext;
	public _right!: ExpContext;
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
	public ADD(): TerminalNode {
		return this.getToken(EqlParser.ADD, 0);
	}
	public SUB(): TerminalNode {
		return this.getToken(EqlParser.SUB, 0);
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpArithmeticAddSub) {
	 		listener.enterExpArithmeticAddSub(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpArithmeticAddSub) {
	 		listener.exitExpArithmeticAddSub(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpArithmeticAddSub) {
			return visitor.visitExpArithmeticAddSub(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpFunctionContext extends ExpContext {
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public NAME(): TerminalNode {
		return this.getToken(EqlParser.NAME, 0);
	}
	public LPAR(): TerminalNode {
		return this.getToken(EqlParser.LPAR, 0);
	}
	public RPAR(): TerminalNode {
		return this.getToken(EqlParser.RPAR, 0);
	}
	public arguments(): ArgumentsContext {
		return this.getTypedRuleContext(ArgumentsContext, 0) as ArgumentsContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpFunction) {
	 		listener.enterExpFunction(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpFunction) {
	 		listener.exitExpFunction(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpFunction) {
			return visitor.visitExpFunction(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
export class ExpArithmeticLTContext extends ExpContext {
	public _left!: ExpContext;
	public _right!: ExpContext;
	constructor(parser: EqlParser, ctx: ExpContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LT(): TerminalNode {
		return this.getToken(EqlParser.LT, 0);
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterExpArithmeticLT) {
	 		listener.enterExpArithmeticLT(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitExpArithmeticLT) {
	 		listener.exitExpArithmeticLT(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitExpArithmeticLT) {
			return visitor.visitExpArithmeticLT(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ArgumentsContext extends ParserRuleContext {
	constructor(parser?: EqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public exp_list(): ExpContext[] {
		return this.getTypedRuleContexts(ExpContext) as ExpContext[];
	}
	public exp(i: number): ExpContext {
		return this.getTypedRuleContext(ExpContext, i) as ExpContext;
	}
    public get ruleIndex(): number {
    	return EqlParser.RULE_arguments;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterArguments) {
	 		listener.enterArguments(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitArguments) {
	 		listener.exitArguments(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitArguments) {
			return visitor.visitArguments(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class ArrayContext extends ParserRuleContext {
	constructor(parser?: EqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public constant_list(): ConstantContext[] {
		return this.getTypedRuleContexts(ConstantContext) as ConstantContext[];
	}
	public constant(i: number): ConstantContext {
		return this.getTypedRuleContext(ConstantContext, i) as ConstantContext;
	}
    public get ruleIndex(): number {
    	return EqlParser.RULE_array;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterArray) {
	 		listener.enterArray(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitArray) {
	 		listener.exitArray(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitArray) {
			return visitor.visitArray(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class KeyContext extends ParserRuleContext {
	constructor(parser?: EqlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public constant(): ConstantContext {
		return this.getTypedRuleContext(ConstantContext, 0) as ConstantContext;
	}
	public NAME(): TerminalNode {
		return this.getToken(EqlParser.NAME, 0);
	}
	public STEXT(): TerminalNode {
		return this.getToken(EqlParser.STEXT, 0);
	}
	public DTEXT(): TerminalNode {
		return this.getToken(EqlParser.DTEXT, 0);
	}
    public get ruleIndex(): number {
    	return EqlParser.RULE_key;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterKey) {
	 		listener.enterKey(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitKey) {
	 		listener.exitKey(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitKey) {
			return visitor.visitKey(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}


export class DictContext extends ParserRuleContext {
	constructor(parser?: EqlParser, parent?: ParserRuleContext, invokingState?: number) {
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
    	return EqlParser.RULE_dict;
	}
	public enterRule(listener: EqlListener): void {
	    if(listener.enterDict) {
	 		listener.enterDict(this);
		}
	}
	public exitRule(listener: EqlListener): void {
	    if(listener.exitDict) {
	 		listener.exitDict(this);
		}
	}
	// @Override
	public accept<Result>(visitor: EqlVisitor<Result>): Result {
		if (visitor.visitDict) {
			return visitor.visitDict(this);
		} else {
			return visitor.visitChildren(this);
		}
	}
}
