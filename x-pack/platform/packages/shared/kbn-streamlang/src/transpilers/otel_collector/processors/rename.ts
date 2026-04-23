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
 * - Non-atomic: OTTL has no atomic rename editor, and under `error_mode: ignore`
 *   the two statements are evaluated independently. If the `set()` succeeds and
 *   the following `delete_key()` raises (very unlikely on a path just written),
 *   the document would end up with both fields populated. Accepted risk for
 *   Phase 1; no upstream primitive to fix it.
 */
export const convertRenameProcessorToOtel = (processor: RenameProcessor): Emission => {
  const { from, to, ignore_missing = false, override = false, where } = processor;
  const fromAttr = attributePath(from);
  const toAttr = attributePath(to);

  const commonParts: string[] = [];
  if (where) commonParts.push(conditionToOttl(where));
  if (!ignore_missing) commonParts.push(`${fromAttr} != nil`);

  // The set statement additionally guards against overwriting an existing target.
  const setWhereParts = [...commonParts];
  if (!override) setWhereParts.push(`${toAttr} == nil`);

  // The delete statement must NOT gate on toAttr == nil: after set() runs,
  // toAttr is populated and the guard would prevent the delete from firing.
  const setWhereExpr = setWhereParts.length
    ? setWhereParts.map((p) => `(${p})`).join(' and ')
    : undefined;
  const deleteWhereExpr = commonParts.length
    ? commonParts.map((p) => `(${p})`).join(' and ')
    : undefined;

  return {
    kind: 'transform',
    statements: [
      withWhereClause(`set(${toAttr}, ${fromAttr})`, setWhereExpr),
      withWhereClause(`delete_key(log.attributes, ${ottlStringLiteral(from)})`, deleteWhereExpr),
    ],
  };
};
