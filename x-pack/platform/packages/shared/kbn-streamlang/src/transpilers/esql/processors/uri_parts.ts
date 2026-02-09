/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-language';
import type { ESQLAstCommand } from '@kbn/esql-language';
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

  const needConditional = ignore_missing || Boolean(where);
  if (!needConditional) {
    if (keep_original) {
      commands.push(
        Builder.command({
          name: 'eval',
          args: [
            Builder.expression.func.binary('=', [
              Builder.expression.column(`${targetPrefix}.original`),
              fromColumn,
            ]),
          ],
        })
      );
    }

    commands.push(
      Builder.command({
        name: 'grok',
        args: [
          fromColumn,
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
      })
    );

    // Copy query/fragment into dotted target fields (and drop temporary columns)
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

    // Parse username/password from user_info (if present)
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

    // Extract extension from path (if any)
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

  // Conditional execution (ignore_missing / where) via a temporary field:
  // - Use CASE to set temp to the input URI when the condition matches, or to '' otherwise.
  //   Using '' avoids ES|QL null/unknown column issues while keeping downstream output stable.
  const uriPartsCondition = buildWhereCondition(from, ignore_missing, where, conditionToESQLAst);
  const tempFieldName = `__temp_uri_parts_where_${from}__`;
  const tempColumn = Builder.expression.column(tempFieldName);

  commands.push(
    Builder.command({
      name: 'eval',
      args: [
        Builder.expression.func.binary('=', [
          tempColumn,
          Builder.expression.func.call('CASE', [
            uriPartsCondition,
            fromColumn,
            Builder.expression.literal.string(''),
          ]),
        ]),
      ],
    })
  );

  if (keep_original) {
    commands.push(
      Builder.command({
        name: 'eval',
        args: [
          Builder.expression.func.binary('=', [
            Builder.expression.column(`${targetPrefix}.original`),
            tempColumn,
          ]),
        ],
      })
    );
  }

  commands.push(
    Builder.command({
      name: 'grok',
      args: [
        tempColumn,
        Builder.expression.literal.string(
          [
            `%{URIPROTO:${targetPrefix}.scheme}://`,
            `(?:%{DATA:${targetPrefix}.user_info}@)?`,
            `%{HOSTNAME:${targetPrefix}.domain}`,
            `(?::%{NUMBER:${targetPrefix}.port:int})?`,
            `(?:%{URIPATH:${targetPrefix}.path})?`,
            `(?:\\?(?<__uri_parts_query__>[^#]+))?`,
            `(?:#(?<__uri_parts_fragment__>.*))?`,
          ].join('')
        ),
      ],
    })
  );

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

  commands.push(Builder.command({ name: 'drop', args: [tempColumn] }));

  return commands;
}

