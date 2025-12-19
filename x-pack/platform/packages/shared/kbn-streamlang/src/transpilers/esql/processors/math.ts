/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand, ESQLAstItem, ESQLSingleAstItem } from '@kbn/esql-language';
import type {
  BinaryExpressionArithmeticOperator,
  BinaryExpressionComparisonOperator,
} from '@kbn/esql-language/src/types';
import type { MathProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';
import {
  FUNCTION_REGISTRY,
  BINARY_ARITHMETIC_OPERATORS,
  validateMathExpression,
  extractFieldsFromMathExpression,
} from '../../shared/math';
import {
  parseMathExpression,
  isTinymathVariable,
  isTinymathFunction,
  type TinymathAST,
} from '../../shared/math/tinymath_utils';

/**
 * ES|QL binary operators supported by the math processor
 * Combines arithmetic (+, -, *, /) and comparison (==, !=, <, <=, >, >=) operators
 * Note: We exclude '=~' (regex match) as it's not used in math expressions
 */
type ESQLBinaryOperator =
  | BinaryExpressionArithmeticOperator
  | Exclude<BinaryExpressionComparisonOperator, '=~'>;

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
    if (Number.isInteger(node)) {
      // Note: 1000.0 is also considered an integer (in tinymath as well)
      return Builder.expression.literal.integer(node);
    }
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

    // Check if this is a core binary arithmetic operator (add, subtract, multiply, divide)
    const binaryArithOp =
      BINARY_ARITHMETIC_OPERATORS[name as keyof typeof BINARY_ARITHMETIC_OPERATORS];
    if (binaryArithOp && args.length === 2) {
      const left = convertTinymathToESQL(args[0]);
      const right = convertTinymathToESQL(args[1]);
      return Builder.expression.func.binary(binaryArithOp, [left, right]);
    }

    // Check if this function is in the registry
    const funcDef = FUNCTION_REGISTRY[name];
    if (funcDef) {
      // Handle binary operators from registry (comparisons: lt, gt, eq, neq, lte, gte)
      if (funcDef.isBinaryOp && args.length === 2) {
        const left = convertTinymathToESQL(args[0]);
        const right = convertTinymathToESQL(args[1]);
        return Builder.expression.func.binary(funcDef.esql as ESQLBinaryOperator, [left, right]);
      }

      // Standard function call (e.g., log)
      const convertedArgs = args.map((arg) => convertTinymathToESQL(arg));
      return Builder.expression.func.call(funcDef.esql, convertedArgs);
    }

    // Fallback for unknown functions - let them through uppercased
    // (validation should have caught unsupported functions earlier)
    const convertedArgs = args.map((arg) => convertTinymathToESQL(arg));
    return Builder.expression.func.call(name.toUpperCase(), convertedArgs);
  }

  // Fallback for unexpected node types
  throw new Error(`Unsupported TinyMath node type: ${JSON.stringify(node)}`);
}

/**
 * Builds an IS NOT NULL check expression for multiple fields combined with AND
 *
 * @param fields Array of field names to check
 * @returns ES|QL AST expression: field1 IS NOT NULL AND field2 IS NOT NULL AND ...
 */
function buildNotNullCheck(fields: string[]): ESQLSingleAstItem | null {
  if (fields.length === 0) {
    return null;
  }

  const checks = fields.map((field) =>
    Builder.expression.func.call('NOT', [
      Builder.expression.func.postfix('IS NULL', Builder.expression.column(field)),
    ])
  );

  if (checks.length === 1) {
    return checks[0];
  }

  // Combine all checks with AND
  return checks.reduce((acc, check) => Builder.expression.func.binary('and', [acc, check]));
}

/**
 * Converts a MathProcessor to ES|QL commands
 *
 * Generates: EVAL <to> = <expression>
 *
 * With `where` condition:
 *   EVAL <to> = CASE(<where>, <expression>, <to>)
 *
 * With `ignore_missing: true`:
 *   EVAL <to> = CASE(field1 IS NOT NULL AND field2 IS NOT NULL, <expression>, <to>)
 *
 * @example
 *   { action: 'math', expression: 'price * quantity', to: 'total' }
 *   -> EVAL total = price * quantity
 *
 * @example
 *   { action: 'math', expression: 'abs(price - 10)', to: 'diff', where: { field: 'active', eq: true } }
 *   -> EVAL diff = CASE(active == true, ABS(price - 10), diff)
 */
export function convertMathProcessorToESQL(processor: MathProcessor): ESQLAstCommand[] {
  // Validate the expression before processing
  const validation = validateMathExpression(processor.expression);
  if (!validation.valid) {
    throw new Error(`Invalid math expression: ${validation.errors.join('; ')}`);
  }

  // Parse the TinyMath expression into an AST
  const ast = parseMathExpression(processor.expression);

  // Convert the TinyMath AST to ES|QL AST
  const mathExpression = convertTinymathToESQL(ast);

  // Build the condition expression (combines where and ignore_missing)
  let conditionExpression: ESQLSingleAstItem | null = null;

  // Handle `where` condition
  const whereExpression = processor.where ? conditionToESQLAst(processor.where) : null;

  // Handle `ignore_missing: true` - skip if any referenced field is null
  let ignoreMissingExpression: ESQLSingleAstItem | null = null;
  if (processor.ignore_missing === true) {
    const fields = extractFieldsFromMathExpression(processor.expression);
    ignoreMissingExpression = buildNotNullCheck(fields);
  }

  // Combine conditions
  if (whereExpression && ignoreMissingExpression) {
    conditionExpression = Builder.expression.func.binary('and', [
      whereExpression,
      ignoreMissingExpression,
    ]);
  } else {
    conditionExpression = whereExpression || ignoreMissingExpression;
  }

  // If there's a condition, wrap in CASE(condition, expression, default)
  const assignment = conditionExpression
    ? Builder.expression.func.call('CASE', [
        conditionExpression,
        mathExpression as ESQLSingleAstItem,
        Builder.expression.column(processor.to), // ELSE keep existing value
      ])
    : mathExpression;

  // Create the EVAL command: EVAL <to> = <assignment>
  return [
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [Builder.expression.column(processor.to), assignment]),
      ],
    }),
  ];
}
