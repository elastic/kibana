/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { MathProcessor } from '../../../../types/processors';
import { painlessFieldAccessor, painlessFieldAssignment } from '../../../../types/utils';
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
 * Converts a TinyMath AST node to Painless expression string.
 */
function convertTinymathToPainless(node: TinymathAST): string {
  // Handle numeric literals
  if (typeof node === 'number') {
    return String(node);
  }

  // Handle variable (field reference) - uses flexible field access for reading
  if (isTinymathVariable(node)) {
    return painlessFieldAccessor(node.value);
  }

  // Handle function
  if (isTinymathFunction(node)) {
    const { name, args } = node;

    // Check if this is a core binary arithmetic operator
    const binaryArithOp =
      BINARY_ARITHMETIC_OPERATORS[name as keyof typeof BINARY_ARITHMETIC_OPERATORS];
    if (binaryArithOp && args.length === 2) {
      const left = convertTinymathToPainless(args[0]);
      const right = convertTinymathToPainless(args[1]);
      return `(${left} ${binaryArithOp} ${right})`;
    }

    // Check if this function is in the registry
    const funcDef = FUNCTION_REGISTRY[name];
    if (funcDef) {
      // Handle binary operators from registry (comparisons: lt, gt, eq, neq, lte, gte)
      if (funcDef.isBinaryOp && args.length === 2) {
        const left = convertTinymathToPainless(args[0]);
        const right = convertTinymathToPainless(args[1]);
        return `(${left} ${funcDef.painless} ${right})`;
      }

      // Standard function call using Math class (e.g., log)
      const convertedArgs = args.map((arg) => convertTinymathToPainless(arg));
      return `${funcDef.painless}(${convertedArgs.join(', ')})`;
    }

    // Fallback for unknown functions
    const convertedArgs = args.map((arg) => convertTinymathToPainless(arg));
    return `${name}(${convertedArgs.join(', ')})`;
  }

  throw new Error(`Unsupported TinyMath node type: ${JSON.stringify(node)}`);
}

/**
 * Builds null check condition for multiple fields.
 *
 * @example
 * buildNullChecks(['price', 'quantity']) -> "$('price', null) != null && $('quantity', null) != null"
 */
function buildNullChecks(fields: string[]): string | null {
  if (fields.length === 0) {
    return null;
  }
  return fields.map((field) => `${painlessFieldAccessor(field)} != null`).join(' && ');
}

/**
 * Converts a MathProcessor to an Ingest Pipeline script processor.
 *
 * @example
 * Input:
 *   { action: 'math', expression: 'price * quantity', to: 'total' }
 *
 * Output:
 *   { script: { lang: 'painless', source: "ctx['total'] = ctx['price'] * ctx['quantity']" } }
 */
export function processMathProcessor(
  processor: Omit<MathProcessor, 'where'> & { if?: string; tag?: string }
): IngestProcessorContainer {
  // Validate the expression
  const validation = validateMathExpression(processor.expression);

  let source: string;

  if (!validation.valid) {
    // Generate a script that throws at runtime instead of failing transpilation.
    // This allows simulation to run and capture the error like other processor errors.
    // Use double quotes for Painless string and escape special characters properly.
    const errorMessage = validation.errors
      .join('; ')
      .replace(/\\/g, '\\\\') // Escape backslashes first
      .replace(/"/g, '\\"'); // Escape double quotes
    source = `throw new IllegalArgumentException("${errorMessage}");`;
  } else {
    // Parse and convert to Painless
    const ast = parseMathExpression(processor.expression);
    const painlessExpression = convertTinymathToPainless(ast);

    // Build the assignment statement using flat key notation
    const targetField = painlessFieldAssignment(processor.to);
    source = `${targetField} = ${painlessExpression};`;

    // Handle ignore_missing: wrap in null checks
    if (processor.ignore_missing === true) {
      const fields = extractFieldsFromMathExpression(processor.expression);
      const nullChecks = buildNullChecks(fields);
      if (nullChecks) {
        source = `if (${nullChecks}) { ${source} }`;
      }
    }
  }

  // Build script processor
  const scriptProcessor: IngestProcessorContainer = {
    script: {
      lang: 'painless',
      source,
    },
  };

  // Add optional description
  if (scriptProcessor.script) {
    (
      scriptProcessor.script as Record<string, unknown>
    ).description = `Math processor: ${processor.expression}`;
  }

  // Add tag if customIdentifier was provided
  if (processor.tag && scriptProcessor.script) {
    (scriptProcessor.script as Record<string, unknown>).tag = processor.tag;
  }

  // Handle if condition (already compiled to Painless by conversions.ts)
  if (processor.if && scriptProcessor.script) {
    (scriptProcessor.script as Record<string, unknown>).if = processor.if;
  }

  // Handle ignore_failure
  if (processor.ignore_failure === true && scriptProcessor.script) {
    (scriptProcessor.script as Record<string, unknown>).ignore_failure = true;
  }

  return scriptProcessor;
}
