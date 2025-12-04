/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-ast';
import { parse } from '@kbn/tinymath';
import type { TinymathAST, TinymathFunction, TinymathVariable } from '@kbn/tinymath';
import type { MathProcessor } from '../../../../types/processors';

/**
 * ES|QL arithmetic operators supported by the math processor
 */
type ESQLArithmeticOperator = '+' | '-' | '*' | '/';

/**
 * Maps TinyMath binary operator function names to ES|QL binary operators
 */
const BINARY_OPERATORS: Record<string, ESQLArithmeticOperator> = {
  add: '+',
  subtract: '-',
  multiply: '*',
  divide: '/',
};

/**
 * Checks if a TinyMath node is a variable (field reference)
 */
function isTinymathVariable(node: TinymathAST): node is TinymathVariable {
  return typeof node === 'object' && node !== null && 'type' in node && node.type === 'variable';
}

/**
 * Checks if a TinyMath node is a function
 */
function isTinymathFunction(node: TinymathAST): node is TinymathFunction {
  return typeof node === 'object' && node !== null && 'type' in node && node.type === 'function';
}

/**
 * Converts a TinyMath AST node to an ES|QL AST item
 *
 * TinyMath AST types:
 * - number: numeric literal (e.g., 42, 3.14)
 * - TinymathVariable: { type: 'variable', value: string } - field reference
 * - TinymathFunction: { type: 'function', name: string, args: TinymathAST[] } - function call or operator
 *
 * Binary operators in TinyMath are represented as functions:
 * - `a + b` becomes { name: 'add', args: [a, b] }
 * - `a - b` becomes { name: 'subtract', args: [a, b] }
 * - `a * b` becomes { name: 'multiply', args: [a, b] }
 * - `a / b` becomes { name: 'divide', args: [a, b] }
 */
function convertTinymathToESQL(node: TinymathAST): ESQLAstItem {
  // Handle numeric literals
  if (typeof node === 'number') {
    return Builder.expression.literal.decimal(node);
  }

  // Handle variable (field reference)
  if (isTinymathVariable(node)) {
    // TinyMath parses field names as variables with the field name in 'value'
    // e.g., 'price' or 'attributes.price' or 'order.item.quantity'
    return Builder.expression.column(node.value);
  }

  // Handle function
  if (isTinymathFunction(node)) {
    const { name, args } = node;

    // Check if this is a binary operator
    const binaryOp = BINARY_OPERATORS[name];
    if (binaryOp && args.length === 2) {
      const left = convertTinymathToESQL(args[0]);
      const right = convertTinymathToESQL(args[1]);
      return Builder.expression.func.binary(binaryOp, [left, right]);
    }

    // For other functions (to be expanded in Stage 2), convert as function call
    // This handles cases like mod(a, b), abs(a), etc.
    const convertedArgs = args.map((arg) => convertTinymathToESQL(arg));
    return Builder.expression.func.call(name.toUpperCase(), convertedArgs);
  }

  // Fallback for unexpected node types
  throw new Error(`Unsupported TinyMath node type: ${JSON.stringify(node)}`);
}

/**
 * Converts a MathProcessor to ES|QL commands
 *
 * Generates: EVAL <to> = <expression>
 *
 * Example:
 *   { action: 'math', expression: 'price * quantity', to: 'total' }
 *   -> EVAL total = price * quantity
 */
export function convertMathProcessorToESQL(processor: MathProcessor): ESQLAstCommand[] {
  // Parse the TinyMath expression into an AST
  const ast = parse(processor.expression);

  // Convert the TinyMath AST to ES|QL AST
  const esqlExpression = convertTinymathToESQL(ast);

  // Create the EVAL command: EVAL <to> = <expression>
  return [
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(processor.to),
          esqlExpression,
        ]),
      ],
    }),
  ];
}
