// Generated from src/ottl/antlr/ottl.g4 by ANTLR 4.13.2

import {ParseTreeListener} from "antlr4";


import { StatementContext } from "./ottlParser.js";
import { EditorContext } from "./ottlParser.js";
import { ConverterContext } from "./ottlParser.js";
import { ArgumentsContext } from "./ottlParser.js";
import { ArgumentContext } from "./ottlParser.js";
import { WhereClauseContext } from "./ottlParser.js";
import { BooleanExpressionContext } from "./ottlParser.js";
import { TermContext } from "./ottlParser.js";
import { BooleanValueContext } from "./ottlParser.js";
import { ConstExprContext } from "./ottlParser.js";
import { ComparisonContext } from "./ottlParser.js";
import { ComparisonOpContext } from "./ottlParser.js";
import { ValueContext } from "./ottlParser.js";
import { LiteralContext } from "./ottlParser.js";
import { MathExpressionContext } from "./ottlParser.js";
import { MathTermContext } from "./ottlParser.js";
import { MathFactorContext } from "./ottlParser.js";
import { PathContext } from "./ottlParser.js";
import { FieldContext } from "./ottlParser.js";
import { KeysContext } from "./ottlParser.js";
import { KeyContext } from "./ottlParser.js";
import { EnumSymbolContext } from "./ottlParser.js";
import { MapValueContext } from "./ottlParser.js";
import { MapItemContext } from "./ottlParser.js";
import { ListValueContext } from "./ottlParser.js";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `ottlParser`.
 */
export default class ottlListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `ottlParser.statement`.
	 * @param ctx the parse tree
	 */
	enterStatement?: (ctx: StatementContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.statement`.
	 * @param ctx the parse tree
	 */
	exitStatement?: (ctx: StatementContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.editor`.
	 * @param ctx the parse tree
	 */
	enterEditor?: (ctx: EditorContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.editor`.
	 * @param ctx the parse tree
	 */
	exitEditor?: (ctx: EditorContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.converter`.
	 * @param ctx the parse tree
	 */
	enterConverter?: (ctx: ConverterContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.converter`.
	 * @param ctx the parse tree
	 */
	exitConverter?: (ctx: ConverterContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.arguments`.
	 * @param ctx the parse tree
	 */
	enterArguments?: (ctx: ArgumentsContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.arguments`.
	 * @param ctx the parse tree
	 */
	exitArguments?: (ctx: ArgumentsContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.argument`.
	 * @param ctx the parse tree
	 */
	enterArgument?: (ctx: ArgumentContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.argument`.
	 * @param ctx the parse tree
	 */
	exitArgument?: (ctx: ArgumentContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.whereClause`.
	 * @param ctx the parse tree
	 */
	enterWhereClause?: (ctx: WhereClauseContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.whereClause`.
	 * @param ctx the parse tree
	 */
	exitWhereClause?: (ctx: WhereClauseContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	enterBooleanExpression?: (ctx: BooleanExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.booleanExpression`.
	 * @param ctx the parse tree
	 */
	exitBooleanExpression?: (ctx: BooleanExpressionContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.term`.
	 * @param ctx the parse tree
	 */
	enterTerm?: (ctx: TermContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.term`.
	 * @param ctx the parse tree
	 */
	exitTerm?: (ctx: TermContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.booleanValue`.
	 * @param ctx the parse tree
	 */
	enterBooleanValue?: (ctx: BooleanValueContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.booleanValue`.
	 * @param ctx the parse tree
	 */
	exitBooleanValue?: (ctx: BooleanValueContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.constExpr`.
	 * @param ctx the parse tree
	 */
	enterConstExpr?: (ctx: ConstExprContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.constExpr`.
	 * @param ctx the parse tree
	 */
	exitConstExpr?: (ctx: ConstExprContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.comparison`.
	 * @param ctx the parse tree
	 */
	enterComparison?: (ctx: ComparisonContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.comparison`.
	 * @param ctx the parse tree
	 */
	exitComparison?: (ctx: ComparisonContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.comparisonOp`.
	 * @param ctx the parse tree
	 */
	enterComparisonOp?: (ctx: ComparisonOpContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.comparisonOp`.
	 * @param ctx the parse tree
	 */
	exitComparisonOp?: (ctx: ComparisonOpContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.value`.
	 * @param ctx the parse tree
	 */
	enterValue?: (ctx: ValueContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.value`.
	 * @param ctx the parse tree
	 */
	exitValue?: (ctx: ValueContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.literal`.
	 * @param ctx the parse tree
	 */
	enterLiteral?: (ctx: LiteralContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.literal`.
	 * @param ctx the parse tree
	 */
	exitLiteral?: (ctx: LiteralContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.mathExpression`.
	 * @param ctx the parse tree
	 */
	enterMathExpression?: (ctx: MathExpressionContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.mathExpression`.
	 * @param ctx the parse tree
	 */
	exitMathExpression?: (ctx: MathExpressionContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.mathTerm`.
	 * @param ctx the parse tree
	 */
	enterMathTerm?: (ctx: MathTermContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.mathTerm`.
	 * @param ctx the parse tree
	 */
	exitMathTerm?: (ctx: MathTermContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.mathFactor`.
	 * @param ctx the parse tree
	 */
	enterMathFactor?: (ctx: MathFactorContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.mathFactor`.
	 * @param ctx the parse tree
	 */
	exitMathFactor?: (ctx: MathFactorContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.path`.
	 * @param ctx the parse tree
	 */
	enterPath?: (ctx: PathContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.path`.
	 * @param ctx the parse tree
	 */
	exitPath?: (ctx: PathContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.field`.
	 * @param ctx the parse tree
	 */
	enterField?: (ctx: FieldContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.field`.
	 * @param ctx the parse tree
	 */
	exitField?: (ctx: FieldContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.keys`.
	 * @param ctx the parse tree
	 */
	enterKeys?: (ctx: KeysContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.keys`.
	 * @param ctx the parse tree
	 */
	exitKeys?: (ctx: KeysContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.key`.
	 * @param ctx the parse tree
	 */
	enterKey?: (ctx: KeyContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.key`.
	 * @param ctx the parse tree
	 */
	exitKey?: (ctx: KeyContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.enumSymbol`.
	 * @param ctx the parse tree
	 */
	enterEnumSymbol?: (ctx: EnumSymbolContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.enumSymbol`.
	 * @param ctx the parse tree
	 */
	exitEnumSymbol?: (ctx: EnumSymbolContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.mapValue`.
	 * @param ctx the parse tree
	 */
	enterMapValue?: (ctx: MapValueContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.mapValue`.
	 * @param ctx the parse tree
	 */
	exitMapValue?: (ctx: MapValueContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.mapItem`.
	 * @param ctx the parse tree
	 */
	enterMapItem?: (ctx: MapItemContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.mapItem`.
	 * @param ctx the parse tree
	 */
	exitMapItem?: (ctx: MapItemContext) => void;
	/**
	 * Enter a parse tree produced by `ottlParser.listValue`.
	 * @param ctx the parse tree
	 */
	enterListValue?: (ctx: ListValueContext) => void;
	/**
	 * Exit a parse tree produced by `ottlParser.listValue`.
	 * @param ctx the parse tree
	 */
	exitListValue?: (ctx: ListValueContext) => void;
}

