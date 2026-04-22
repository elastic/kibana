/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenameProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlStringLiteral, withWhereClause } from './common';

/**
 * Emits a pair of OTTL statements: copy the source into the target, then delete
 * the source. Both inherit the same gating condition so they fire together.
 *
 * - `ignore_missing: false` (default) gates on source presence. Ingest/ES|QL
 *   error out in this case; OTTL has no equivalent — we approximate by simply
 *   not acting when the source is missing. A warning could be surfaced here if
 *   we want stricter parity in a later phase.
 * - `override: false` (default) gates on target being absent.
 */
export const convertRenameProcessorToOtel = (processor: RenameProcessor): Emission => {
  const { from, to, ignore_missing = false, override = false, where } = processor;
  const fromAttr = attributePath(from);
  const toAttr = attributePath(to);

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) whereParts.push(`${fromAttr} != nil`);
  if (!override) whereParts.push(`${toAttr} == nil`);

  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  return {
    kind: 'transform',
    statements: [
      withWhereClause(`set(${toAttr}, ${fromAttr})`, whereExpr),
      withWhereClause(`delete_key(log.attributes, ${ottlStringLiteral(from)})`, whereExpr),
    ],
  };
};
