/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcatProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlStringLiteral, withWhereClause } from './common';

/**
 * Emits `set(log.attributes["to"], Concat([...items...], "")) where <cond>`.
 *
 * Each `from` entry is rendered as either a field reference (`log.attributes["name"]`)
 * or a quoted OTTL string literal. The empty delimiter means items are concatenated
 * directly — any desired separator should be a literal entry in the `from` array.
 *
 * `ignore_missing` (default false): when false, nil guards for all field entries are
 * ANDed into the where clause so the entire statement is skipped if any source field
 * is absent. When true, missing fields are treated as empty strings by OTTL's Concat.
 */
export const convertConcatProcessorToOtel = (
  processor: ConcatProcessor
): { emission: Emission; warnings: string[] } => {
  const { from, to, ignore_missing = false, where } = processor;
  const toAttr = attributePath(to);

  const items = from.map((entry) =>
    entry.type === 'field' ? attributePath(entry.value) : ottlStringLiteral(entry.value)
  );

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) {
    const fieldEntries = from.filter((e) => e.type === 'field');
    for (const entry of fieldEntries) {
      whereParts.push(`${attributePath(entry.value)} != nil`);
    }
  }

  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  const concatExpr = `Concat([${items.join(', ')}], "")`;
  return {
    emission: {
      kind: 'transform',
      statements: [withWhereClause(`set(${toAttr}, ${concatExpr})`, whereExpr)],
    },
    warnings: [],
  };
};
