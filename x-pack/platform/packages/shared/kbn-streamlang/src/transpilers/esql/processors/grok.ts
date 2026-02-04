/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-language';
import type { GrokProcessor } from '../../../../types/processors';
import { parseMultiGrokPatterns } from '../../../../types/utils/grok_patterns';
import { conditionToESQLAst } from '../condition_to_esql';
import { buildIgnoreMissingFilter, castFieldsToGrokTypes, buildWhereCondition } from './common';
import { unwrapPatternDefinitions } from '../../../../types/utils/grok_pattern_definitions';

/**
 * Converts a Streamlang GrokProcessor into a list of ES|QL AST commands.
 *
 * Conditional execution logic:
 *  - If neither `ignore_missing` nor `where` is provided: emit a single GROK command.
 *  - Otherwise, use CASE approach to conditionally execute GROK:
 *      * Create temporary field and use CASE to conditionally set source field or empty string (empty string avoids ES|QL NULL errors)
 *      * Apply GROK to temporary field
 *      * Drop temporary field
 *    Condition: (exists(from) if ignore_missing) AND (where condition, if provided)
 *
 * Type handling:
 *  - Pre-grok: cast all GROKed target fields to their suffixed (or default) types with
 *              TO_STRING (keyword), TO_INTEGER or TO_DOUBLE for consistency.
 *
 * @example:
 *    ```typescript
 *    const streamlangDSL: StreamlangDSL = {
 *      steps: [
 *        {
 *          action: 'grok',
 *          from: 'message',
 *          patterns: ["%{IP:client.ip} %{NUMBER:size:int} %{NUMBER:burn_rate:float}"],
 *          ignore_missing: true,
 *          where: { field: 'flags.process', exists: true },
 *        } as GrokProcessor,
 *      ],
 *    };
 *    ```
 *
 *    Generates (conceptually):
 *    ```txt
 *    // | WHERE NOT(message IS NULL)  // Only if ignore_missing = false
 *    | EVAL `client.ip` = TO_STRING(`client.ip`)
 *    | EVAL `size` = TO_INTEGER(`size`)
 *    | EVAL `burn_rate` = TO_DOUBLE(`burn_rate`)
 *    | EVAL __temp_grok_where_message__ = CASE(NOT(message IS NULL) AND NOT(`flags.process` IS NULL), message, "")
 *    | GROK __temp_grok_where_message__ "%{IP:client.ip} %{NUMBER:size:int} %{NUMBER:burn_rate:float}"
 *    | DROP __temp_grok_where_message__
 *    ```
 */
export function convertGrokProcessorToESQL(processor: GrokProcessor): ESQLAstCommand[] {
  const {
    from,
    ignore_missing = false, // default mirrors ingest grok behavior
    where,
  } = processor;

  const fromColumn = Builder.expression.column(from);
  const primaryPattern = unwrapPatternDefinitions(processor)[0];
  const grokCommand = buildGrokCommand(fromColumn, primaryPattern);
  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  // Check if conditional execution is needed for 'where' clauses, return simple command otherwise
  const needConditional = ignore_missing || Boolean(where);
  if (!needConditional) {
    commands.push(grokCommand);
    return commands;
  }

  // Pre-cast existing target fields to their configured GROK types to avoid ES|QL type conflict errors
  const { allFields } = parseMultiGrokPatterns([primaryPattern]);
  if (allFields.length > 0) {
    commands.push(...castFieldsToGrokTypes(allFields));
  }

  // Build condition for when GROK should execute
  const grokCondition = buildWhereCondition(from, ignore_missing, where, conditionToESQLAst);

  // Create temporary field name for conditional processing
  // Using CASE, set temporary field to source field if condition passes, empty string otherwise
  const tempFieldName = `__temp_grok_where_${from}__`;
  const tempColumn = Builder.expression.column(tempFieldName);

  //
  commands.push(
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          tempColumn,
          Builder.expression.func.call('CASE', [
            grokCondition,
            fromColumn,
            Builder.expression.literal.string(''), // Empty string avoids ES|QL NULL errors that would break the pipeline
          ]),
        ]),
      ],
    })
  );

  // Apply GROK to the temporary field
  commands.push(buildGrokCommand(tempColumn, primaryPattern));

  // Clean up temporary field
  commands.push(Builder.command({ name: 'drop', args: [tempColumn] }));

  return commands;
}

/** Build the GROK command (primary pattern only) */
function buildGrokCommand(fromColumn: ESQLAstItem, pattern: string): ESQLAstCommand {
  return Builder.command({
    name: 'grok',
    args: [fromColumn, Builder.expression.literal.string(pattern)],
  });
}
