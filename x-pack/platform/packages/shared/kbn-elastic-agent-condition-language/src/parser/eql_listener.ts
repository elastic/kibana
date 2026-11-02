/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-nocheck
// Generated from Eql.g4 by ANTLR 4.13.2

import {ParseTreeListener} from "antlr4";


import { ExpListContext } from "./eql_parser.js";
import { BooleanContext } from "./eql_parser.js";
import { ConstantContext } from "./eql_parser.js";
import { VariableContext } from "./eql_parser.js";
import { VariableExpContext } from "./eql_parser.js";
import { ExpArithmeticNEQContext } from "./eql_parser.js";
import { ExpEVariableContext } from "./eql_parser.js";
import { ExpArithmeticEQContext } from "./eql_parser.js";
import { ExpArithmeticGTEContext } from "./eql_parser.js";
import { ExpArithmeticLTEContext } from "./eql_parser.js";
import { ExpArithmeticGTContext } from "./eql_parser.js";
import { ExpArithmeticMulDivModContext } from "./eql_parser.js";
import { ExpDictContext } from "./eql_parser.js";
import { ExpTextContext } from "./eql_parser.js";
import { ExpNumberContext } from "./eql_parser.js";
import { ExpLogicalAndContext } from "./eql_parser.js";
import { ExpLogicalORContext } from "./eql_parser.js";
import { ExpFloatContext } from "./eql_parser.js";
import { ExpVariableContext } from "./eql_parser.js";
import { ExpArrayContext } from "./eql_parser.js";
import { ExpNotContext } from "./eql_parser.js";
import { ExpInParenContext } from "./eql_parser.js";
import { ExpBooleanContext } from "./eql_parser.js";
import { ExpArithmeticAddSubContext } from "./eql_parser.js";
import { ExpFunctionContext } from "./eql_parser.js";
import { ExpArithmeticLTContext } from "./eql_parser.js";
import { ArgumentsContext } from "./eql_parser.js";
import { ArrayContext } from "./eql_parser.js";
import { KeyContext } from "./eql_parser.js";
import { DictContext } from "./eql_parser.js";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `EqlParser`.
 */
export default class EqlListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `EqlParser.expList`.
	 * @param ctx the parse tree
	 */
	enterExpList?: (ctx: ExpListContext) => void;
	/**
	 * Exit a parse tree produced by `EqlParser.expList`.
	 * @param ctx the parse tree
	 */
	exitExpList?: (ctx: ExpListContext) => void;
	/**
	 * Enter a parse tree produced by `EqlParser.boolean`.
	 * @param ctx the parse tree
	 */
	enterBoolean?: (ctx: BooleanContext) => void;
	/**
	 * Exit a parse tree produced by `EqlParser.boolean`.
	 * @param ctx the parse tree
	 */
	exitBoolean?: (ctx: BooleanContext) => void;
	/**
	 * Enter a parse tree produced by `EqlParser.constant`.
	 * @param ctx the parse tree
	 */
	enterConstant?: (ctx: ConstantContext) => void;
	/**
	 * Exit a parse tree produced by `EqlParser.constant`.
	 * @param ctx the parse tree
	 */
	exitConstant?: (ctx: ConstantContext) => void;
	/**
	 * Enter a parse tree produced by `EqlParser.variable`.
	 * @param ctx the parse tree
	 */
	enterVariable?: (ctx: VariableContext) => void;
	/**
	 * Exit a parse tree produced by `EqlParser.variable`.
	 * @param ctx the parse tree
	 */
	exitVariable?: (ctx: VariableContext) => void;
	/**
	 * Enter a parse tree produced by `EqlParser.variableExp`.
	 * @param ctx the parse tree
	 */
	enterVariableExp?: (ctx: VariableExpContext) => void;
	/**
	 * Exit a parse tree produced by `EqlParser.variableExp`.
	 * @param ctx the parse tree
	 */
	exitVariableExp?: (ctx: VariableExpContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpArithmeticNEQ`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpArithmeticNEQ?: (ctx: ExpArithmeticNEQContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpArithmeticNEQ`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpArithmeticNEQ?: (ctx: ExpArithmeticNEQContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpEVariable`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpEVariable?: (ctx: ExpEVariableContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpEVariable`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpEVariable?: (ctx: ExpEVariableContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpArithmeticEQ`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpArithmeticEQ?: (ctx: ExpArithmeticEQContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpArithmeticEQ`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpArithmeticEQ?: (ctx: ExpArithmeticEQContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpArithmeticGTE`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpArithmeticGTE?: (ctx: ExpArithmeticGTEContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpArithmeticGTE`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpArithmeticGTE?: (ctx: ExpArithmeticGTEContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpArithmeticLTE`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpArithmeticLTE?: (ctx: ExpArithmeticLTEContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpArithmeticLTE`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpArithmeticLTE?: (ctx: ExpArithmeticLTEContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpArithmeticGT`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpArithmeticGT?: (ctx: ExpArithmeticGTContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpArithmeticGT`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpArithmeticGT?: (ctx: ExpArithmeticGTContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpArithmeticMulDivMod`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpArithmeticMulDivMod?: (ctx: ExpArithmeticMulDivModContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpArithmeticMulDivMod`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpArithmeticMulDivMod?: (ctx: ExpArithmeticMulDivModContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpDict`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpDict?: (ctx: ExpDictContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpDict`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpDict?: (ctx: ExpDictContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpText`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpText?: (ctx: ExpTextContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpText`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpText?: (ctx: ExpTextContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpNumber`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpNumber?: (ctx: ExpNumberContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpNumber`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpNumber?: (ctx: ExpNumberContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpLogicalAnd`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpLogicalAnd?: (ctx: ExpLogicalAndContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpLogicalAnd`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpLogicalAnd?: (ctx: ExpLogicalAndContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpLogicalOR`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpLogicalOR?: (ctx: ExpLogicalORContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpLogicalOR`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpLogicalOR?: (ctx: ExpLogicalORContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpFloat`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpFloat?: (ctx: ExpFloatContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpFloat`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpFloat?: (ctx: ExpFloatContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpVariable`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpVariable?: (ctx: ExpVariableContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpVariable`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpVariable?: (ctx: ExpVariableContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpArray`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpArray?: (ctx: ExpArrayContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpArray`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpArray?: (ctx: ExpArrayContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpNot`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpNot?: (ctx: ExpNotContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpNot`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpNot?: (ctx: ExpNotContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpInParen`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpInParen?: (ctx: ExpInParenContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpInParen`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpInParen?: (ctx: ExpInParenContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpBoolean`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpBoolean?: (ctx: ExpBooleanContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpBoolean`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpBoolean?: (ctx: ExpBooleanContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpArithmeticAddSub`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpArithmeticAddSub?: (ctx: ExpArithmeticAddSubContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpArithmeticAddSub`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpArithmeticAddSub?: (ctx: ExpArithmeticAddSubContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpFunction`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpFunction?: (ctx: ExpFunctionContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpFunction`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpFunction?: (ctx: ExpFunctionContext) => void;
	/**
	 * Enter a parse tree produced by the `ExpArithmeticLT`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	enterExpArithmeticLT?: (ctx: ExpArithmeticLTContext) => void;
	/**
	 * Exit a parse tree produced by the `ExpArithmeticLT`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 */
	exitExpArithmeticLT?: (ctx: ExpArithmeticLTContext) => void;
	/**
	 * Enter a parse tree produced by `EqlParser.arguments`.
	 * @param ctx the parse tree
	 */
	enterArguments?: (ctx: ArgumentsContext) => void;
	/**
	 * Exit a parse tree produced by `EqlParser.arguments`.
	 * @param ctx the parse tree
	 */
	exitArguments?: (ctx: ArgumentsContext) => void;
	/**
	 * Enter a parse tree produced by `EqlParser.array`.
	 * @param ctx the parse tree
	 */
	enterArray?: (ctx: ArrayContext) => void;
	/**
	 * Exit a parse tree produced by `EqlParser.array`.
	 * @param ctx the parse tree
	 */
	exitArray?: (ctx: ArrayContext) => void;
	/**
	 * Enter a parse tree produced by `EqlParser.key`.
	 * @param ctx the parse tree
	 */
	enterKey?: (ctx: KeyContext) => void;
	/**
	 * Exit a parse tree produced by `EqlParser.key`.
	 * @param ctx the parse tree
	 */
	exitKey?: (ctx: KeyContext) => void;
	/**
	 * Enter a parse tree produced by `EqlParser.dict`.
	 * @param ctx the parse tree
	 */
	enterDict?: (ctx: DictContext) => void;
	/**
	 * Exit a parse tree produced by `EqlParser.dict`.
	 * @param ctx the parse tree
	 */
	exitDict?: (ctx: DictContext) => void;
}

