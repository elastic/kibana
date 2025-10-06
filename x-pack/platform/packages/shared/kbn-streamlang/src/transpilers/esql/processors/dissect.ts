/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-ast';
import type { DissectProcessor } from '../../../../types/processors';
import { parseMultiDissectPatterns } from '../../../../types/utils/dissect_patterns';
import { conditionToESQLAst } from '../condition_to_esql';
import { buildIgnoreMissingFilter, castFieldsToString, buildWhereCondition } from './common';

/**
 * Converts a Streamlang DissectProcessor into a list of ES|QL AST commands.
 *
 * Conditional execution logic:
 *  - If neither `ignore_missing` nor `where` is provided: emit a single DISSECT command.
 *  - Otherwise, use CASE approach to conditionally execute DISSECT:
 *      * Create temporary field using CASE to conditionally set to source field or empty string (empty string avoids ES|QL NULL errors)
 *      * Apply DISSECT to temporary field
 *      * Drop temporary field
 *    Condition: (exists(from) if ignore_missing) AND (where condition, if provided)
 *
 * Type handling:
 *  - Pre-dissect: cast all prospective DISSECT output fields to avoid ES|QL's type conflict errors.
 *  - DISSECT yields keyword (string) values; further casts are user driven.
 *
 *  @example
 *     ```typescript
 *     const streamlangDSL: StreamlangDSL = {
 *        steps: [
 *          {
 *            action: 'dissect',
 *            from: 'message',
 *            pattern: '[%{log.level}] %{client.ip}',
 *            ignore_missing: true,
 *            where: {
 *              field: 'flags.process',
 *              exists: true,
 *            },
 *          } as DissectProcessor,
 *        ],
 *      };
 *    ```
 *
 *   Generates (conceptually):
 *    ```txt
 *      // | WHERE NOT(message IS NULL)  // Only if ignore_missing = false
 *      | EVAL `log.level` = TO_STRING(`log.level`)
 *      | EVAL `client.ip` = TO_STRING(`client.ip`)
 *      | EVAL __temp_dissect_where_message__ = CASE(NOT(message IS NULL) AND NOT(`flags.process` IS NULL), message, "")
 *      | DISSECT __temp_dissect_where_message__ "[%{log.level}] %{client.ip}"
 *      | DROP __temp_dissect_where_message__
 *    ```
 */
export function convertDissectProcessorToESQL(processor: DissectProcessor): ESQLAstCommand[] {
  const {
    from,
    pattern, // eslint-disable-next-line @typescript-eslint/naming-convention
    append_separator, // eslint-disable-next-line @typescript-eslint/naming-convention
    ignore_missing = false, // default same as ES Dissect Enrich Processor
    where,
  } = processor;

  const fromColumn = Builder.expression.column(from);
  const dissectCommand = buildDissectCommand(pattern, fromColumn, append_separator);
  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  // Check if conditional execution is needed for 'where' clauses, return simple command otherwise
  const needConditional = ignore_missing || Boolean(where);
  if (!needConditional) {
    commands.push(dissectCommand);
    return commands;
  }

  // Pre-cast all dissect output fields to string for consistency
  const { allFields } = parseMultiDissectPatterns([pattern]);
  const fieldNames = allFields.map((f) => f.name);
  commands.push(...castFieldsToString(fieldNames));

  // Build condition for when DISSECT should execute
  const dissectCondition = buildWhereCondition(from, ignore_missing, where, conditionToESQLAst);

  // Create temporary field name for conditional processing
  // Using CASE, set temporary field to source field if condition passes, empty string otherwise
  const tempFieldName = `__temp_dissect_where_${from}__`;
  const tempColumn = Builder.expression.column(tempFieldName);

  commands.push(
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          tempColumn,
          Builder.expression.func.call('CASE', [
            dissectCondition,
            fromColumn,
            Builder.expression.literal.string(''), // Empty string avoids ES|QL NULL errors that would break the pipeline
          ]),
        ]),
      ],
    })
  );

  // Apply DISSECT to the temporary field
  commands.push(buildDissectCommand(pattern, tempColumn, append_separator));

  // Clean up temporary field
  commands.push(Builder.command({ name: 'drop', args: [tempColumn] }));

  return commands;
}

/** Build the base DISSECT command (no conditional logic) */
function buildDissectCommand(pattern: string, fromColumn: ESQLAstItem, appendSep?: string) {
  const args: ESQLAstItem[] = [fromColumn, Builder.expression.literal.string(pattern)];
  const cmd = Builder.command({ name: 'dissect', args });
  if (appendSep) {
    cmd.args.push(
      Builder.option({
        name: 'append_separator',
        args: [Builder.expression.literal.string(appendSep)],
      })
    );
  }
  return cmd;
}
