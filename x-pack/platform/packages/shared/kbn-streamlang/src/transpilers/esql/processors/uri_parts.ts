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
  const targetPrefixColumn = Builder.expression.column(targetPrefix);

  const commands: ESQLAstCommand[] = [];

  // Add missing field filter if needed (ignore_missing = false)
  const missingFieldFilter = buildIgnoreMissingFilter(from, ignore_missing);
  if (missingFieldFilter) {
    commands.push(missingFieldFilter);
  }

  // Conditional execution pattern mirrors the `user_agent` processor:
  // - If neither `ignore_missing` nor `where` is provided: use the source column directly.
  // - Otherwise: pass a CASE(...) expression as the URI_PARTS source so documents that don't match the
  //   condition are treated as NULL (which avoids parsing warnings while preserving ingest-pipeline-like
  //   "processor did not run" semantics).
  const needConditional = ignore_missing || Boolean(where);
  const sourceExpression: ESQLAstItem = needConditional
    ? Builder.expression.func.call('CASE', [
        buildWhereCondition(from, ignore_missing, where, conditionToESQLAst),
        fromColumn,
        Builder.expression.literal.nil(),
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

  commands.push(
    Builder.command({
      name: 'uri_parts',
      args: [Builder.expression.func.binary('=', [targetPrefixColumn, sourceExpression])],
    })
  );

  return commands;
}
