/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand } from '@kbn/esql-ast';
import type { RemoveByPrefixProcessor } from '../../../../types/processors';
import { buildIgnoreMissingFilter } from './common';

/**
 * Converts a Streamlang RemoveByPrefixProcessor into a list of ES|QL AST commands.
 *
 * Removes a field and all its nested fields (field.*). This requires two DROP commands:
 * 1. DROP field - removes the base field
 * 2. DROP field.* - removes all nested/flattened fields with the prefix
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(field IS NULL)` filters missing fields
 *
 * @example:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'remove_by_prefix',
 *          from: 'host',
 *          ignore_missing: true,
 *        } as RemoveByPrefixProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates (conceptually):
 *    ```txt
 *    // | WHERE NOT(host IS NULL)  // Only if ignore_missing = false
 *    | DROP host, host.*  // Removes host and all host.* fields
 *    ```
 */
export function convertRemoveByPrefixProcessorToESQL(
  processor: RemoveByPrefixProcessor
): ESQLAstCommand[] {
  const {
    from,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ignore_missing = false, // default: false (field must exist)
  } = processor;

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  // Use DROP command to remove both the field and all nested fields (field.*)
  // This handles both subobjects and flattened fields
  const dropCommand = Builder.command({
    name: 'drop',
    args: [Builder.expression.column(from), Builder.expression.column(`${from}.*`)],
  });

  commands.push(dropCommand);
  return commands;
}
