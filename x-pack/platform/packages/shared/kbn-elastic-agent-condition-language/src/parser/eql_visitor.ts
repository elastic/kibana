/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-nocheck
// Generated from Eql.g4 by ANTLR 4.13.2

import {ParseTreeVisitor} from 'antlr4';


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
 * This interface defines a complete generic visitor for a parse tree produced
 * by `EqlParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export default class EqlVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `EqlParser.expList`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpList?: (ctx: ExpListContext) => Result;
	/**
	 * Visit a parse tree produced by `EqlParser.boolean`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBoolean?: (ctx: BooleanContext) => Result;
	/**
	 * Visit a parse tree produced by `EqlParser.constant`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitConstant?: (ctx: ConstantContext) => Result;
	/**
	 * Visit a parse tree produced by `EqlParser.variable`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitVariable?: (ctx: VariableContext) => Result;
	/**
	 * Visit a parse tree produced by `EqlParser.variableExp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitVariableExp?: (ctx: VariableExpContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpArithmeticNEQ`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpArithmeticNEQ?: (ctx: ExpArithmeticNEQContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpEVariable`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpEVariable?: (ctx: ExpEVariableContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpArithmeticEQ`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpArithmeticEQ?: (ctx: ExpArithmeticEQContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpArithmeticGTE`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpArithmeticGTE?: (ctx: ExpArithmeticGTEContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpArithmeticLTE`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpArithmeticLTE?: (ctx: ExpArithmeticLTEContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpArithmeticGT`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpArithmeticGT?: (ctx: ExpArithmeticGTContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpArithmeticMulDivMod`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpArithmeticMulDivMod?: (ctx: ExpArithmeticMulDivModContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpDict`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpDict?: (ctx: ExpDictContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpText`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpText?: (ctx: ExpTextContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpNumber`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpNumber?: (ctx: ExpNumberContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpLogicalAnd`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpLogicalAnd?: (ctx: ExpLogicalAndContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpLogicalOR`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpLogicalOR?: (ctx: ExpLogicalORContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpFloat`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpFloat?: (ctx: ExpFloatContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpVariable`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpVariable?: (ctx: ExpVariableContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpArray`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpArray?: (ctx: ExpArrayContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpNot`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpNot?: (ctx: ExpNotContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpInParen`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpInParen?: (ctx: ExpInParenContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpBoolean`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpBoolean?: (ctx: ExpBooleanContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpArithmeticAddSub`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpArithmeticAddSub?: (ctx: ExpArithmeticAddSubContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpFunction`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpFunction?: (ctx: ExpFunctionContext) => Result;
	/**
	 * Visit a parse tree produced by the `ExpArithmeticLT`
	 * labeled alternative in `EqlParser.exp`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitExpArithmeticLT?: (ctx: ExpArithmeticLTContext) => Result;
	/**
	 * Visit a parse tree produced by `EqlParser.arguments`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitArguments?: (ctx: ArgumentsContext) => Result;
	/**
	 * Visit a parse tree produced by `EqlParser.array`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitArray?: (ctx: ArrayContext) => Result;
	/**
	 * Visit a parse tree produced by `EqlParser.key`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitKey?: (ctx: KeyContext) => Result;
	/**
	 * Visit a parse tree produced by `EqlParser.dict`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitDict?: (ctx: DictContext) => Result;
}

