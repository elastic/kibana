/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-language';
import type { ESQLMapEntry } from '@kbn/esql-language/src/types';
import type { UserAgentProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';
import { buildIgnoreMissingFilter, buildWhereCondition } from './common';

/**
 * Converts a Streamlang UserAgentProcessor into a list of ES|QL AST commands.
 *
 * The user_agent processor extracts details from browser user agent strings
 * including browser name, version, OS, and device information.
 *
 * Conditional execution logic:
 *  - If neither `ignore_missing` nor `where` is provided: emit a single USER_AGENT command.
 *  - Otherwise, use CASE approach to conditionally execute USER_AGENT:
 *      * Create temporary field using CASE to conditionally set to source field or empty string
 *      * Apply USER_AGENT to temporary field
 *      * Drop temporary field
 *    Condition: (exists(from) if ignore_missing) AND (where condition, if provided)
 *
 * @example
 *    ```typescript
 *    const processor: UserAgentProcessor = {
 *      action: 'user_agent',
 *      from: 'http.user_agent',
 *      to: 'parsed_agent',
 *      regex_file: 'myregexes.yaml',
 *      extract_device_type: true,
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | USER_AGENT parsed_agent = http.user_agent WITH {"regex_file": "myregexes.yaml", "extract_device_type": true}
 *    ```
 */
export function convertUserAgentProcessorToESQL(processor: UserAgentProcessor): ESQLAstCommand[] {
  const {
    from,
    to = 'user_agent', // default target field
    regex_file,
    extract_device_type,
    ignore_missing = false,
    where,
  } = processor;

  const fromColumn = Builder.expression.column(from);
  const toColumn = Builder.expression.column(to);
  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  // Check if conditional execution is needed for 'where' clauses
  const needConditional = ignore_missing || Boolean(where);

  if (!needConditional) {
    // Simple case: just emit the USER_AGENT command
    commands.push(buildUserAgentCommand(toColumn, fromColumn, regex_file, extract_device_type));
    return commands;
  }

  // Build condition for when USER_AGENT should execute
  const userAgentCondition = buildWhereCondition(from, ignore_missing, where, conditionToESQLAst);

  // Create temporary field name for conditional processing
  const tempFieldName = `__temp_user_agent_where_${from}__`;
  const tempColumn = Builder.expression.column(tempFieldName);

  // Using CASE, set temporary field to source field if condition passes, empty string otherwise
  commands.push(
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          tempColumn,
          Builder.expression.func.call('CASE', [
            userAgentCondition,
            fromColumn,
            Builder.expression.literal.string(''), // Empty string avoids ES|QL NULL errors
          ]),
        ]),
      ],
    })
  );

  // Apply USER_AGENT to the temporary field
  commands.push(buildUserAgentCommand(toColumn, tempColumn, regex_file, extract_device_type));

  // Clean up temporary field
  commands.push(Builder.command({ name: 'drop', args: [tempColumn] }));

  return commands;
}

/**
 * Builds the USER_AGENT command with optional WITH clause for options.
 *
 * Syntax: USER_AGENT target = source [WITH { options }]
 */
function buildUserAgentCommand(
  toColumn: ESQLAstItem,
  fromColumn: ESQLAstItem,
  regexFile?: string,
  extractDeviceType?: boolean
): ESQLAstCommand {
  // Build the assignment: target = source
  const assignment = Builder.expression.func.binary('=', [toColumn, fromColumn]);

  const args: ESQLAstItem[] = [assignment];

  // Build WITH options map if any options are provided
  const mapEntries: ESQLMapEntry[] = [];

  if (regexFile !== undefined) {
    mapEntries.push(
      Builder.expression.entry('regex_file', Builder.expression.literal.string(regexFile))
    );
  }

  if (extractDeviceType !== undefined) {
    mapEntries.push(
      Builder.expression.entry(
        'extract_device_type',
        Builder.expression.literal.boolean(extractDeviceType)
      )
    );
  }

  const cmd = Builder.command({ name: 'user_agent', args });

  // Add WITH option with the map if there are any options
  if (mapEntries.length > 0) {
    cmd.args.push(
      Builder.option({
        name: 'with',
        args: [Builder.expression.map({ entries: mapEntries })],
      })
    );
  }

  return cmd;
}
