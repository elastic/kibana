/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand } from '@kbn/esql-language';
import type { ReplaceProcessor } from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';
import { conditionToESQLAst } from '../condition_to_esql';

/**
 * Converts a Streamlang ReplaceProcessor into a list of ES|QL AST commands.
 *
 * For unconditional replacement (no 'where' or 'where: always'):
 *   Uses EVAL with replace() function: EVAL target_field = replace(field, pattern, replacement)
 *   If `to` is not provided, updates field in-place: EVAL field = replace(field, pattern, replacement)
 *
 * For conditional replacement (with 'where' condition):
 *   Uses EVAL with CASE: EVAL target_field = CASE(<condition>, replace(field, pattern, replacement), existing_value)
 *   If `to` is not provided, updates field in-place
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * Limitations:
 * - Multi-value arrays are supported in Ingest Pipeline `gsub` processor but cannot be cleanly
 *   handled in ES|QL due to inability to iteratively apply replace or to collapse MV_EXPAND results back to arrays.
 *   See: https://github.com/elastic/elasticsearch/issues/133988
 *
 * @example Unconditional (in-place, with regex):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'replace',
 *          from: 'message',
 *          pattern: '/\\d{3}/', // Regex: replace all three-digit numbers with [NUM]
 *          replacement: '[NUM]',
 *        } as ReplaceProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL message = replace(message, "\\d{3}", "[NUM]")
 *    ```
 *
 * @example Unconditional (with target field):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'replace',
 *          from: 'message',
 *          to: 'clean_message',
 *          pattern: 'error',
 *          replacement: 'warning',
 *        } as ReplaceProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL clean_message = replace(message, "error", "warning")
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'replace',
 *          from: 'message',
 *          pattern: 'error',
 *          replacement: 'warning',
 *          where: { field: 'status', eq: 'test' },
 *        } as ReplaceProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL message = CASE(status == "test", replace(message, "error", "warning"), message)
 *    ```
 */
export function convertReplaceProcessorToESQL(processor: ReplaceProcessor): ESQLAstCommand[] {
  const {
    from,
    to,
    pattern,
    replacement,
    ignore_missing = false, // default: false (field must exist, similar to 'gsub' Ingest Pipeline processor)
  } = processor;

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  const fromColumn = Builder.expression.column(from);
  const targetColumn = Builder.expression.column(to ?? from); // Use target field if provided, else update in-place
  const patternLiteral = Builder.expression.literal.string(pattern);
  const replacementLiteral = Builder.expression.literal.string(replacement);

  // Build replace() function call
  const replaceFunction = Builder.expression.func.call('replace', [
    fromColumn,
    patternLiteral,
    replacementLiteral,
  ]);

  // Check if this is conditional or unconditional replacement
  if ('where' in processor && processor.where && !('always' in processor.where)) {
    // Conditional replacement: use EVAL with CASE
    // EVAL target_field = CASE(<condition>, replace(field, pattern, replacement), existing_value)
    const conditionExpression = conditionToESQLAst(processor.where);

    // For CASE else clause: use target field if it exists, else use source field
    const elseValue = to ? targetColumn : fromColumn;

    const caseExpression = Builder.expression.func.call('CASE', [
      conditionExpression,
      replaceFunction,
      elseValue, // ELSE keep existing value
    ]);

    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [targetColumn, caseExpression])],
    });

    commands.push(evalCommand);
  } else {
    // Unconditional replacement: use EVAL with replace() function
    // EVAL target_field = replace(field, pattern, replacement)
    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [targetColumn, replaceFunction])],
    });

    commands.push(evalCommand);
  }

  return commands;
}
