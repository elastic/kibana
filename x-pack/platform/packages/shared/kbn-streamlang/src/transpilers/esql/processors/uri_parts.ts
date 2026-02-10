/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand, ESQLAstItem } from '@kbn/esql-language';
import type { UriPartsProcessor } from '../../../../types/processors';
import { conditionToESQLAst } from '../condition_to_esql';
import { buildIgnoreMissingFilter, buildWhereCondition } from './common';

/**
 * Converts a Streamlang UriPartsProcessor into ES|QL commands.
 *
 * Implementation notes:
 * - We currently emulate URI parsing via `GROK` patterns, because the `URI_PARTS` ES|QL command
 *   isn't available in all supported test clusters yet.
 * - `keep_original` is emulated by setting `${prefix}.original` via `EVAL`.
 * - `remove_if_successful` isn't currently emulated (ES|QL lacks an equivalent "drop only on success").
 */
export function convertUriPartsProcessorToESQL(processor: UriPartsProcessor): ESQLAstCommand[] {
  const {
    from,
    to,
    keep_original = true, // default mirrors Elasticsearch ingest uri_parts behavior
    ignore_missing = false, // default mirrors Elasticsearch ingest uri_parts behavior
    where,
  } = processor;

  const targetPrefix = to ?? 'url';
  const fromColumn = Builder.expression.column(from);
  const tempQueryColumn = Builder.expression.column('__uri_parts_query__');
  const tempFragmentColumn = Builder.expression.column('__uri_parts_fragment__');

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  // Conditional execution pattern mirrors the `user_agent` processor:
  // - If neither `ignore_missing` nor `where` is provided: use the source column directly.
  // - Otherwise: pass a CASE(...) expression as the GROK source so documents that don't match the
  //   condition are treated as an empty string (which results in no matches / null outputs).
  const needConditional = ignore_missing || Boolean(where);
  const sourceExpression: ESQLAstItem = needConditional
    ? Builder.expression.func.call('CASE', [
        buildWhereCondition(from, ignore_missing, where, conditionToESQLAst),
        fromColumn,
        Builder.expression.literal.string(''),
      ])
    : fromColumn;

  if (keep_original) {
    commands.push(
      Builder.command({
        name: 'eval',
        args: [
          Builder.expression.func.binary('=', [
            Builder.expression.column(`${targetPrefix}.original`),
            sourceExpression,
          ]),
        ],
      })
    );
  }

  commands.push(buildUriPartsGrokCommand(sourceExpression, targetPrefix));

  commands.push(
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(`${targetPrefix}.query`),
          tempQueryColumn,
        ]),
      ],
    })
  );
  commands.push(
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          Builder.expression.column(`${targetPrefix}.fragment`),
          tempFragmentColumn,
        ]),
      ],
    })
  );
  commands.push(Builder.command({ name: 'drop', args: [tempQueryColumn, tempFragmentColumn] }));

  commands.push(
    Builder.command({
      name: 'grok',
      args: [
        Builder.expression.column(`${targetPrefix}.user_info`),
        Builder.expression.literal.string(
          `^%{USERNAME:${targetPrefix}.username}(?::%{DATA:${targetPrefix}.password})?$`
        ),
      ],
    })
  );

  commands.push(
    Builder.command({
      name: 'grok',
      args: [
        Builder.expression.column(`${targetPrefix}.path`),
        Builder.expression.literal.string(`.*\\.%{WORD:${targetPrefix}.extension}`),
      ],
    })
  );

  return commands;
}

function buildUriPartsGrokCommand(fromExpression: ESQLAstItem, targetPrefix: string): ESQLAstCommand {
  return Builder.command({
    name: 'grok',
    args: [
      fromExpression,
      Builder.expression.literal.string(
        [
          // scheme://
          `%{URIPROTO:${targetPrefix}.scheme}://`,
          // [user[:pass]@]
          `(?:%{DATA:${targetPrefix}.user_info}@)?`,
          // domain
          `%{HOSTNAME:${targetPrefix}.domain}`,
          // [:port]
          `(?::%{NUMBER:${targetPrefix}.port:int})?`,
          // [/path]
          `(?:%{URIPATH:${targetPrefix}.path})?`,
          // [?query][#fragment]
          // Use regex named captures (no dots allowed) then copy into dotted target fields via EVAL.
          `(?:\\?(?<__uri_parts_query__>[^#]+))?`,
          `(?:#(?<__uri_parts_fragment__>.*))?`,
        ].join('')
      ),
    ],
  });
}

