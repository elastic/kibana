/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// src/AstBuilderVisitor.ts

import { ErrorNode, ParserRuleContext, TerminalNode } from 'antlr4';
import { default as OttlVisitor } from './antlr/ottlListener';
import * as P from './antlr/OttlParser'; // P for Parser contexts
import * as AST from './types'; // Your AST definitions

export class AstBuilderVisitor implements OttlVisitor {
  protected defaultResult(): AST.AstNode {
    // Should not happen if all visit methods are implemented
    throw new Error('No default result implementation.');
  }

  // NEW: Manually dispatch to the correct visit method based on context type
  visit(ctx: any): any {
    if (!ctx) return null;
    const ctxName = ctx.constructor.name;
    console.log(`Visiting context: ${ctxName}`);
    switch (ctxName) {
      case 'StatementContext':
        return this.visitStatement(ctx);
      case 'EditorContext':
        return this.visitEditor(ctx);
      case 'WhereClauseContext':
        return this.visitWhereClause(ctx);
      case 'BooleanExpressionContext':
        return this.visitBooleanExpression(ctx);
      case 'TermContext':
        return this.visitTerm(ctx);
      case 'BooleanValueContext':
        return this.visitBooleanValue(ctx);
      case 'ComparisonContext':
        return this.visitComparison(ctx);
      case 'ValueContext':
        return this.visitValue(ctx);
      case 'LiteralContext':
        return this.visitLiteral(ctx);
      case 'EnumSymbolContext':
        return this.visitEnumSymbol(ctx);
      case 'MapValueContext':
        return this.visitMapValue(ctx);
      case 'ListValueContext':
        return this.visitListValue(ctx);
      case 'MathExpressionContext':
        return this.visitMathExpression(ctx);
      case 'MathTermContext':
        return this.visitMathTerm(ctx);
      case 'MathFactorContext':
        return this.visitMathFactor(ctx);
      case 'PathContext':
        return this.visitPath(ctx);
      case 'FieldContext':
        return this.visitField(ctx);
      case 'KeysContext':
        return this.visitKeys(ctx);
      case 'KeyContext':
        return this.visitKey(ctx);
      case 'ConverterContext':
        return this.visitConverter(ctx);
      case 'ArgumentsContext':
        return this.visitArguments(ctx);
      case 'ArgumentContext':
        return this.visitArgument(ctx);
      // Fallback for any unhandled contexts
      default:
        return ctx.getText ? ctx.getText() : ctx;
    }
  }

  visitStatement(ctx: P.StatementContext): AST.Statement {
    const editor = this.visit(ctx.editor()) as AST.Editor;
    const whereClauseCtx = ctx.whereClause();
    const whereClause = whereClauseCtx
      ? (this.visit(whereClauseCtx) as AST.WhereClause)
      : undefined;
    return { type: 'Statement', editor, whereClause };
  }

  visitEditor(ctx: P.EditorContext): AST.Editor {
    const functionName = ctx.LOWERCASE_IDENTIFIER().getText();
    const argsCtx = ctx.arguments();
    const args = argsCtx ? (this.visit(argsCtx) as AST.Argument[]) : [];
    return { type: 'Editor', function: functionName, arguments: args };
  }

  visitErrorNode(node: ErrorNode): void {
    // Handle error nodes if needed
    console.error(`Error node encountered: ${node.getText()}`);
  }

  visitTerminal(node: TerminalNode): void {
    // Handle terminal nodes if needed
    console.log(`Terminal node: ${node.getText()}`);
  }

  enterEveryRule(ctx: ParserRuleContext): void {
    // Optional: Handle entering every rule
    console.log(`Entering rule: ${ctx.constructor.name}`);
  }

  exitEveryRule(ctx: ParserRuleContext): void {
    // Optional: Handle exiting every rule
    console.log(`Exiting rule: ${ctx.constructor.name}`);
  }

  visitConverter(ctx: P.ConverterContext): AST.Converter {
    const functionName = ctx.UPPERCASE_IDENTIFIER().getText();
    const argsCtx = ctx.arguments();
    const args = argsCtx ? (this.visit(argsCtx) as AST.Argument[]) : [];
    const keyCtxs = ctx.keys_list(); // Get all key contexts
    const keys = keyCtxs.map((k) => this.visit(k) as AST.KeyAccess);
    return { type: 'Converter', function: functionName, arguments: args, keys };
  }

  visitArguments(ctx: P.ArgumentsContext): AST.Argument[] {
    return ctx.argument_list().map((argCtx) => this.visit(argCtx) as AST.Argument);
  }

  visitArgument(ctx: P.ArgumentContext): AST.Argument {
    const identifier = ctx.LOWERCASE_IDENTIFIER();
    const name = identifier ? identifier.getText() : undefined;
    // Either value or UPPERCASE_IDENTIFIER exists based on grammar
    const valueCtx = ctx.value();
    const valueNode = valueCtx
      ? (this.visit(valueCtx) as AST.Value)
      : ({ type: 'EnumSymbol', symbol: ctx.UPPERCASE_IDENTIFIER()!.getText() } as AST.EnumSymbol); // Treat standalone UC identifier as enum/symbol arg
    return { type: 'Argument', name, value: valueNode };
  }

  visitWhereClause(ctx: P.WhereClauseContext): AST.WhereClause {
    const expression = this.visit(ctx.booleanExpression()) as AST.BooleanExpression;
    return { type: 'WhereClause', expression };
  }

  // --- Boolean Expressions ---

  visitBooleanExpression(ctx: P.BooleanExpressionContext): AST.BooleanExpression {
    let left = this.visit(ctx.term(0)) as AST.BooleanExpression; // Start with the first term

    for (let i = 1; i < ctx.term_list().length; i++) {
      const right = this.visit(ctx.term(i)) as AST.BooleanExpression;
      left = { type: 'BooleanOrExpression', left, right }; // Chain OR operations
    }
    return left;
  }

  visitTerm(ctx: P.TermContext): AST.BooleanExpression {
    let left = this.visit(ctx.booleanValue(0)) as AST.BooleanExpression; // Start with the first value

    for (let i = 1; i < ctx.booleanValue_list().length; i++) {
      const right = this.visit(ctx.booleanValue(i)) as AST.BooleanExpression;
      left = { type: 'BooleanAndExpression', left, right }; // Chain AND operations
    }
    return left;
  }

  visitBooleanValue(ctx: P.BooleanValueContext): AST.BooleanPrimaryExpression {
    const negated = !!ctx.NOT();
    let valueNode: AST.Comparison | AST.Literal | AST.Converter | AST.BooleanParenExpression;

    if (ctx.comparison()) {
      valueNode = this.visit(ctx.comparison()!) as AST.Comparison;
    } else if (ctx.constExpr()) {
      // constExpr can be BOOLEAN or converter
      const constExprCtx = ctx.constExpr()!;
      if (constExprCtx.BOOLEAN()) {
        valueNode = { type: 'Literal', value: constExprCtx.BOOLEAN()!.getText() === 'true' };
      } else {
        // converter
        valueNode = this.visit(constExprCtx.converter()!) as AST.Converter;
      }
    } else {
      // LPAREN booleanExpression RPAREN
      const expression = this.visit(ctx.booleanExpression()!) as AST.BooleanExpression;
      valueNode = { type: 'BooleanParenExpression', expression };
    }

    return { type: 'BooleanPrimaryExpression', negated, value: valueNode };
  }

  visitComparison(ctx: P.ComparisonContext): AST.Comparison {
    const left = this.visit(ctx.value(0)) as AST.Value;
    const right = this.visit(ctx.value(1)) as AST.Value;
    const operator = ctx.comparisonOp().getText() as AST.Comparison['operator']; // Assuming operator texts match AST types
    return { type: 'Comparison', left, operator, right };
  }

  // --- Values ---

  visitValue(ctx: P.ValueContext): AST.Value {
    if (ctx.NIL()) {
      return { type: 'Literal', value: null };
    }
    if (ctx.BYTES()) {
      return { type: 'Literal', value: AST.parseBytes(ctx.BYTES()!.getText()) };
    }
    if (ctx.STRING()) {
      return { type: 'Literal', value: AST.unquoteString(ctx.STRING()!.getText()) };
    }
    if (ctx.BOOLEAN()) {
      return { type: 'Literal', value: ctx.BOOLEAN()!.getText() === 'true' };
    }
    if (ctx.literal()) {
      // Handles INT/FLOAT from the specific rule
      return this.visit(ctx.literal()!) as AST.Literal;
    }
    if (ctx.enumSymbol()) {
      return this.visit(ctx.enumSymbol()!) as AST.EnumSymbol;
    }
    if (ctx.mapValue()) {
      return this.visit(ctx.mapValue()!) as AST.MapNode;
    }
    if (ctx.listValue()) {
      return this.visit(ctx.listValue()!) as AST.ListNode;
    }
    if (ctx.mathExpression()) {
      return this.visit(ctx.mathExpression()!) as AST.MathExpression;
    }
    if (ctx.path()) {
      return this.visit(ctx.path()!) as AST.Path;
    }
    if (ctx.converter()) {
      return this.visit(ctx.converter()!) as AST.Converter;
    }

    throw new Error(`Unhandled value context: ${ctx.getText()}`);
  }

  // Visit the specific literal rule for INT/FLOAT
  visitLiteral(ctx: P.LiteralContext): AST.Literal {
    if (ctx.FLOAT()) {
      return { type: 'Literal', value: parseFloat(ctx.FLOAT()!.getText()) };
    }
    if (ctx.INT()) {
      return { type: 'Literal', value: parseInt(ctx.INT()!.getText(), 10) };
    }
    throw new Error(`Unhandled literal context: ${ctx.getText()}`);
  }

  visitEnumSymbol(ctx: P.EnumSymbolContext): AST.EnumSymbol {
    return { type: 'EnumSymbol', symbol: ctx.UPPERCASE_IDENTIFIER().getText() };
  }

  visitMapValue(ctx: P.MapValueContext): AST.MapNode {
    const entries = new Map<string, AST.Value>();
    for (const itemCtx of ctx.mapItem_list()) {
      const key = AST.unquoteString(itemCtx.STRING().getText());
      const value = this.visit(itemCtx.value()) as AST.Value;
      entries.set(key, value);
    }
    return { type: 'Map', entries };
  }

  visitListValue(ctx: P.ListValueContext): AST.ListNode {
    const values = ctx.value_list().map((vCtx) => this.visit(vCtx) as AST.Value);
    return { type: 'List', values };
  }

  // --- Paths ---

  visitPath(ctx: P.PathContext): AST.Path {
    const contextIdentifier = ctx.LOWERCASE_IDENTIFIER();
    const context = contextIdentifier ? contextIdentifier.getText() : undefined;
    const fields = ctx.field_list().map((fCtx) => this.visit(fCtx) as AST.Field);
    return { type: 'Path', context, fields };
  }

  visitField(ctx: P.FieldContext): AST.Field {
    const name = ctx.LOWERCASE_IDENTIFIER().getText();
    const keysCtx = ctx.keys_list();
    const keys = keysCtx
      ? (keysCtx.flatMap((kCtx) => this.visit(kCtx) as AST.KeyAccess) as AST.KeyAccess[])
      : [];
    return { type: 'Field', name, keys };
  }

  visitKeys(ctx: P.KeysContext): AST.KeyAccess[] {
    return ctx.key_list().map((k) => this.visit(k) as AST.KeyAccess);
  }

  visitKey(ctx: P.KeyContext): AST.KeyAccess {
    let keyNode: AST.Value | AST.Literal;
    if (ctx.STRING()) {
      keyNode = { type: 'Literal', value: AST.unquoteString(ctx.STRING()!.getText()) };
    } else if (ctx.INT()) {
      keyNode = { type: 'Literal', value: parseInt(ctx.INT()!.getText(), 10) };
    } else if (ctx.mathExpression()) {
      keyNode = this.visit(ctx.mathExpression()!) as AST.MathExpression;
    } else if (ctx.path()) {
      keyNode = this.visit(ctx.path()!) as AST.Path;
    } else if (ctx.converter()) {
      keyNode = this.visit(ctx.converter()!) as AST.Converter;
    } else {
      throw new Error(`Unhandled key type: ${ctx.getText()}`);
    }
    return { type: 'KeyAccess', key: keyNode };
  }

  // --- Math Expressions ---

  visitMathExpression(ctx: P.MathExpressionContext): AST.MathExpression {
    let left = this.visit(ctx.mathTerm(0)) as AST.MathExpression; // Must cast, could be factor

    for (let i = 1; i < ctx.mathTerm_list().length; i++) {
      const operatorNode = ctx.getChild(i * 2 - 1) as TerminalNode; // PLUS or MINUS
      const operator = operatorNode.getText() as '+' | '-';
      const right = this.visit(ctx.mathTerm(i)) as AST.MathExpression;
      left = { type: 'MathAddSubExpression', left, operator, right };
    }
    return left;
  }

  visitMathTerm(ctx: P.MathTermContext): AST.MathTerm {
    let left = this.visit(ctx.mathFactor(0)) as AST.MathTerm; // Must cast, could be factor

    for (let i = 1; i < ctx.mathFactor_list().length; i++) {
      const operatorNode = ctx.getChild(i * 2 - 1) as TerminalNode; // STAR or SLASH
      const operator = operatorNode.getText() as '*' | '/';
      const right = this.visit(ctx.mathFactor(i)) as AST.MathTerm;
      left = { type: 'MathMulDivExpression', left, operator, right };
    }
    return left;
  }

  visitMathFactor(ctx: P.MathFactorContext): AST.MathFactor {
    if (ctx.FLOAT()) {
      return { type: 'Literal', value: parseFloat(ctx.FLOAT()!.getText()) };
    }
    if (ctx.INT()) {
      return { type: 'Literal', value: parseInt(ctx.INT()!.getText(), 10) };
    }
    if (ctx.path()) {
      return this.visit(ctx.path()!) as AST.Path;
    }
    if (ctx.converter()) {
      return this.visit(ctx.converter()!) as AST.Converter;
    }
    if (ctx.mathExpression()) {
      // Parenthesized expression
      const expression = this.visit(ctx.mathExpression()!) as AST.MathExpression;
      return { type: 'MathParenExpression', expression };
    }
    throw new Error(`Unhandled math factor: ${ctx.getText()}`);
  }

  // Potentially add visitTerminal, visitErrorNode if needed for debugging or finer control
}
