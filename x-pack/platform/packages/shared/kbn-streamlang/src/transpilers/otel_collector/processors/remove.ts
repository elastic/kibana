/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RemoveProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlStringLiteral, withWhereClause } from './common';

/**
 * Emits `delete_key(log.attributes, "<from>") where <cond>`.
 *
 * - `ignore_missing: false` (default) adds a presence check to the where clause.
 *   OTTL `delete_key` is a no-op on missing keys, so adding the check preserves
 *   parity with ingest pipeline (which errors). A follow-up could route to a
 *   warning-emitting path instead.
 */
export const convertRemoveProcessorToOtel = (processor: RemoveProcessor): Emission => {
  const { from, ignore_missing = false, where } = processor;
  const fromAttr = attributePath(from);

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) whereParts.push(`${fromAttr} != nil`);

  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  return {
    kind: 'transform',
    statements: [
      withWhereClause(`delete_key(log.attributes, ${ottlStringLiteral(from)})`, whereExpr),
    ],
  };
};
