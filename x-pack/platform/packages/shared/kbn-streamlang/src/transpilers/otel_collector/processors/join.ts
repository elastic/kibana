/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JoinProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlStringLiteral, withWhereClause } from './common';

/**
 * Emits `set(log.attributes["to"], Concat([field1, field2, ...], "delim")) where <cond>`.
 *
 * OTTL's `Concat(list, delimiter)` joins the string representation of each item
 * with `delimiter`. When any source field is nil, `Concat` raises a TypeError
 * that is swallowed by `error_mode: ignore`. To preserve `ignore_missing: false`
 * semantics (skip instead of error), nil guards are AND-ed for all source fields.
 *
 * For `ignore_missing: true` the nil guards are omitted; missing fields will
 * contribute the string `"nil"` or the statement will be silently skipped,
 * depending on the OTTL runtime version.
 */
export const convertJoinProcessorToOtel = (processor: JoinProcessor): Emission => {
  const { from, delimiter, to, ignore_missing = false, where } = processor;
  const toAttr = attributePath(to);
  const fieldAttrs = from.map(attributePath);

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) {
    for (const attr of fieldAttrs) {
      whereParts.push(`${attr} != nil`);
    }
  }

  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  const listExpr = `[${fieldAttrs.join(', ')}]`;
  return {
    kind: 'transform',
    statements: [
      withWhereClause(
        `set(${toAttr}, Concat(${listExpr}, ${ottlStringLiteral(delimiter)}))`,
        whereExpr
      ),
    ],
  };
};
