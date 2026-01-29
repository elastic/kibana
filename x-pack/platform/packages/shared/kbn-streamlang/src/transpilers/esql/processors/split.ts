/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand } from '@kbn/esql-language';
import type { SplitProcessor } from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';
import { conditionToESQLAst } from '../condition_to_esql';

/**
 * Converts a Streamlang SplitProcessor into a list of ES|QL AST commands.
 *
 * For unconditional split (no 'where' or 'where: always'):
 *   Uses EVAL with SPLIT() function: EVAL target_field = SPLIT(field, separator)
 *   If `to` is not provided, updates field in-place: EVAL field = SPLIT(field, separator)
 *
 * For conditional split (with 'where' condition):
 *   Uses EVAL with CASE: EVAL target_field = CASE(<condition>, SPLIT(field, separator), existing_value)
 *   If `to` is not provided, updates field in-place
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * Limitations:
 * - ES|QL's SPLIT function only supports single byte delimiters, while Ingest Pipeline's split
 *   processor supports regex patterns. Complex regex separators may not work identically.
 * - The `preserve_trailing` option from Ingest Pipeline is not directly supported in ES|QL.
 *   ES|QL's SPLIT function behavior for trailing empty strings may differ.
 *
 * @example Unconditional (in-place):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'split',
 *          from: 'tags',
 *          separator: ',',
 *        } as SplitProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags = SPLIT(tags, ",")
 *    ```
 *
 * @example Unconditional (with target field):
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'split',
 *          from: 'tags',
 *          to: 'tags_array',
 *          separator: ',',
 *        } as SplitProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags_array = SPLIT(tags, ",")
 *    ```
 *
 * @example Conditional:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'split',
 *          from: 'tags',
 *          separator: ',',
 *          where: { field: 'status', eq: 'active' },
 *        } as SplitProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | EVAL tags = CASE(status == "active", SPLIT(tags, ","), tags)
 *    ```
 */
export function convertSplitProcessorToESQL(processor: SplitProcessor): ESQLAstCommand[] {
  const {
    from,
    to,
    separator,
    ignore_missing = false, // default: false (field must exist, similar to split Ingest Pipeline processor)
  } = processor;

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  const fromColumn = Builder.expression.column(from);
  const targetColumn = Builder.expression.column(to ?? from); // Use target field if provided, else update in-place
  const separatorLiteral = Builder.expression.literal.string(separator);

  // Build SPLIT() function call
  const splitFunction = Builder.expression.func.call('SPLIT', [fromColumn, separatorLiteral]);

  // Check if this is conditional or unconditional split
  if ('where' in processor && processor.where && !('always' in processor.where)) {
    // Conditional split: use EVAL with CASE
    // EVAL target_field = CASE(<condition>, SPLIT(field, separator), existing_value)
    const conditionExpression = conditionToESQLAst(processor.where);

    // For CASE else clause: use target field if it exists, else use source field
    const elseValue = to ? targetColumn : fromColumn;

    const caseExpression = Builder.expression.func.call('CASE', [
      conditionExpression,
      splitFunction,
      elseValue, // ELSE keep existing value
    ]);

    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [targetColumn, caseExpression])],
    });

    commands.push(evalCommand);
  } else {
    // Unconditional split: use EVAL with SPLIT() function
    // EVAL target_field = SPLIT(field, separator)
    const evalCommand = Builder.command({
      name: 'eval',
      args: [Builder.expression.func.binary('=', [targetColumn, splitFunction])],
    });

    commands.push(evalCommand);
  }

  return commands;
}
