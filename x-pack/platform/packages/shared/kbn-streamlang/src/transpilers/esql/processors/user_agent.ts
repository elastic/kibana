/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@elastic/esql';
import type { ESQLAstCommand, ESQLAstItem, ESQLMapEntry } from '@elastic/esql/types';
import { isAlwaysCondition } from '../../../../types/conditions';
import type { UserAgentProcessor, UserAgentProperty } from '../../../../types/processors';
import {
  buildCoalescePrefixedFieldsEval,
  buildConditionalEval,
  buildDropColumns,
  buildIgnoreMissingFilter,
} from './common';

const internalColumnPrefix = '__streamlang_user_agent';
const internalExpressionColumn = '__streamlang_user_agent_expression';

const DEFAULT_USER_AGENT_PROPERTIES: UserAgentProperty[] = ['name', 'version', 'os', 'device'];

/**
 * Leaf field paths (relative to the target prefix) that USER_AGENT may populate.
 * See https://www.elastic.co/docs/reference/query-languages/esql/commands/user-agent
 */
function getUserAgentSubfields(
  properties: UserAgentProperty[] | undefined,
  extractDeviceType: boolean | undefined
): string[] {
  const effectiveProperties = properties ?? DEFAULT_USER_AGENT_PROPERTIES;
  const fields: string[] = [];

  for (const property of effectiveProperties) {
    switch (property) {
      case 'name':
        fields.push('name');
        break;
      case 'version':
        fields.push('version');
        break;
      case 'os':
        fields.push('os.name', 'os.version', 'os.full');
        break;
      case 'device':
        fields.push('device.name');
        if (extractDeviceType) {
          fields.push('device.type');
        }
        break;
      case 'original':
        break;
    }
  }

  return fields;
}

/**
 * Converts a Streamlang UserAgentProcessor into a list of ES|QL AST commands.
 *
 *  1. `WHERE NOT(<from> IS NULL)` pre-filter when `ignore_missing: false`.
 *  2. If `where` is set (and not `{ always: true }`), gate the input through
 *     `EVAL __streamlang_user_agent_expression = CASE(<where>, <from>, NULL)`.
 *     The NULL fallback (not the helper's default `""`) makes USER_AGENT(NULL)
 *     emit all-null sub-fields on rows failing the condition, so the temp
 *     output stays empty and the COALESCE merge preserves prior `<to>.*` values.
 *  3. `USER_AGENT __streamlang_user_agent = <input>` — parse into a temp prefix
 *     so the user's target fields are never written by the command directly.
 *     USER_AGENT is destructive: it nullifies sub-fields when parsing yields
 *     no value (failed parse, blank or null input), which would clobber any
 *     pre-existing `<to>.*` data if we wrote into the target directly.
 *  4. `EVAL <to>.<f> = COALESCE(__streamlang_user_agent.<f>, <to>.<f>), ...`
 *     merges the parsed sub-fields into `<to>.*`, preferring the new value
 *     but preserving the prior value whenever the parse produced null. This
 *     is the destructive-overwrite fix.
 *  5. Unless `properties` excludes it, `EVAL <to>.original = COALESCE(<input>,
 *     <to>.original)` writes the source string into `<to>.original` whenever
 *     the processor ran (matching the ingest USER_AGENT processor, which always
 *     stores the input in `<target>.original`). On gated rows the input is
 *     NULL, so COALESCE preserves the prior value.
 *  6. `DROP __streamlang_user_agent.<f>, ..., __streamlang_user_agent_expression`
 *     to clean up the temp columns introduced in steps 2–3.
 *
 * Mirrors the pattern used by `registered_domain` and `uri_parts`. The set of
 * sub-fields to COALESCE-merge depends on `properties` and `extract_device_type`,
 * so it is computed dynamically (see `getUserAgentSubfields`).
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

  const isConditional = Boolean(where && !isAlwaysCondition(where));

  const commands: ESQLAstCommand[] = [];
  const missingFieldFilter = buildIgnoreMissingFilter(ignore_missing, from);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  let sourceExpression = from;
  if (isConditional) {
    // Use NULL (not the helper's default `""`) as the gated-row sentinel: per
    // ES|QL's USER_AGENT command, a NULL input emits NULL across every output
    // sub-field, so the COALESCE merge below naturally preserves prior `<to>.*`
    // values on rows that failed `where`. See the contract on
    // `buildConditionalEval` and the parallel use in `uri_parts`.
    commands.push(
      buildConditionalEval(where!, from, internalExpressionColumn, Builder.expression.literal.nil())
    );
    sourceExpression = internalExpressionColumn;
  }

  const userAgentArgs: ESQLAstItem[] = [
    Builder.expression.func.binary('=', [
      Builder.expression.column(internalColumnPrefix),
      Builder.expression.column(sourceExpression),
    ]),
  ];
  const cmd = Builder.command({ name: 'user_agent', args: userAgentArgs });
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

  const subfields = getUserAgentSubfields(properties, extract_device_type);
  if (subfields.length > 0) {
    commands.push(buildCoalescePrefixedFieldsEval(subfields, internalColumnPrefix, to));
  }

  const includeOriginal = properties?.includes('original') ?? true;
  if (includeOriginal) {
    commands.push(
      Builder.command({
        name: 'eval',
        args: [
          Builder.expression.func.binary('=', [
            Builder.expression.column(`${to}.original`),
            Builder.expression.func.call('COALESCE', [
              Builder.expression.column(sourceExpression),
              Builder.expression.column(`${to}.original`),
            ]),
          ]),
        ],
      })
    );
  }

  const dropColumns = subfields.map((field) => `${internalColumnPrefix}.${field}`);
  if (isConditional) {
    dropColumns.push(internalExpressionColumn);
  }
  if (dropColumns.length > 0) {
    commands.push(buildDropColumns(dropColumns));
  }

  return commands;
}
