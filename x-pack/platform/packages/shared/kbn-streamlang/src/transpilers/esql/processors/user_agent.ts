/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-language';
import type { ESQLMapEntry } from '@kbn/esql-language/src/types';
import type { UserAgentProcessor, UserAgentProperty } from '../../../../types/processors';
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
 *  - Otherwise, use inline CASE expression to conditionally pass source field:
 *      * USER_AGENT target = CASE(condition, source, "") WITH {...}
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
    properties,
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
    commands.push(
      buildUserAgentCommand(toColumn, fromColumn, regex_file, properties, extract_device_type)
    );
  } else {
    // Build condition for when USER_AGENT should execute
    const userAgentCondition = buildWhereCondition(from, ignore_missing, where, conditionToESQLAst);

    // Create CASE expression: CASE(condition, source, "")
    const conditionalSource = Builder.expression.func.call('CASE', [
      userAgentCondition,
      fromColumn,
      Builder.expression.literal.string(''), // Empty string when condition false
    ]);

    // Apply USER_AGENT with inline CASE expression
    commands.push(
      buildUserAgentCommand(
        toColumn,
        conditionalSource,
        regex_file,
        properties,
        extract_device_type
      )
    );
  }

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
  properties?: UserAgentProperty[],
  extractDeviceType?: boolean
): ESQLAstCommand {
  const args: ESQLAstItem[] = [Builder.expression.func.binary('=', [toColumn, fromColumn])];
  const cmd = Builder.command({ name: 'user_agent', args });

  const mapEntries: ESQLMapEntry[] = [];

  if (regexFile !== undefined) {
    mapEntries.push(
      Builder.expression.entry('regex_file', Builder.expression.literal.string(regexFile))
    );
  }

  if (properties !== undefined && properties.length > 0) {
    mapEntries.push(
      Builder.expression.entry(
        'properties',
        Builder.expression.list.literal({
          values: properties.map((prop) => Builder.expression.literal.string(prop)),
        })
      )
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
