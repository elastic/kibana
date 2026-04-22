/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstItem, ESQLMapEntry } from '@elastic/esql/types';
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
 *  - Emit `USER_AGENT target = source` when no `where` clause.
 *  - When `where` is provided, use inline CASE so parsing is skipped unless the condition holds:
 *      * USER_AGENT target = CASE(condition, source, "") WITH {...}
 *
 * @example
 *    ```typescript
 *    const processor: UserAgentProcessor = {
 *      action: 'user_agent',
 *      from: 'user_agent.original',
 *      to: 'parsed_agent',
 *      regex_file: 'myregexes.yaml',
 *      extract_device_type: true,
 *    };
 *    ```
 *
 *    Generates:
 *    ```txt
 *    | USER_AGENT parsed_agent = user_agent.original WITH {"regex_file": "myregexes.yaml", "extract_device_type": true}
 *    ```
 */
export function convertUserAgentProcessorToESQL(processor: UserAgentProcessor): ESQLAstCommand[] {
  const {
    from,
    to = 'user_agent',
    regex_file,
    properties,
    extract_device_type,
    ignore_missing = false,
    where,
  } = processor;

  const commands: ESQLAstCommand[] = [];
  const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, from);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  const fromColumn = Builder.expression.column(from);
  const toColumn = Builder.expression.column(to);
  let conditionalSource: ESQLAstItem = fromColumn;

  if (where) {
    const userAgentCondition = buildWhereCondition(from, ignore_missing, where, conditionToESQLAst);
    conditionalSource = Builder.expression.func.call('CASE', [
      userAgentCondition,
      fromColumn,
      Builder.expression.literal.string(''),
    ]);
  }

  const args: ESQLAstItem[] = [Builder.expression.func.binary('=', [toColumn, conditionalSource])];
  const cmd = Builder.command({ name: 'user_agent', args });
  const mapEntries: ESQLMapEntry[] = [];

  if (regex_file) {
    mapEntries.push(
      Builder.expression.entry('regex_file', Builder.expression.literal.string(regex_file))
    );
  }

  const filteredProperties = properties?.filter((prop) => prop !== 'original');
  if (filteredProperties?.length) {
    mapEntries.push(
      Builder.expression.entry(
        'properties',
        Builder.expression.list.literal({
          values: filteredProperties.map((prop) => Builder.expression.literal.string(prop)),
        })
      )
    );
  }

  if (extract_device_type !== undefined) {
    mapEntries.push(
      Builder.expression.entry(
        'extract_device_type',
        Builder.expression.literal.boolean(extract_device_type)
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

  commands.push(cmd);
  return commands;
}
