/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReplaceProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlStringLiteral, withWhereClause } from './common';

/**
 * Emits one or two OTTL statements to apply a regex replacement.
 *
 * OTTL's `replace_pattern` is an editor (in-place). When `to` differs from `from`
 * we copy first then replace in the target — the same two-statement pattern used
 * by `rename`. The copy is conditional on `from != nil` and the target being absent
 * so that partial-execution under `error_mode: ignore` doesn't leave stale values.
 *
 * When `to` is absent (in-place), a single `replace_pattern` statement is emitted.
 */
export const convertReplaceProcessorToOtel = (processor: ReplaceProcessor): Emission => {
  const { from, to, pattern, replacement, ignore_missing = false, where } = processor;
  const fromAttr = attributePath(from);

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) whereParts.push(`${fromAttr} != nil`);

  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  const patternLit = ottlStringLiteral(pattern);
  const replacementLit = ottlStringLiteral(replacement);

  if (!to || to === from) {
    return {
      kind: 'transform',
      statements: [
        withWhereClause(
          `replace_pattern(${fromAttr}, ${patternLit}, ${replacementLit})`,
          whereExpr
        ),
      ],
    };
  }

  // Different target: copy then replace in-place in the new field.
  const toAttr = attributePath(to);
  return {
    kind: 'transform',
    statements: [
      withWhereClause(`set(${toAttr}, ${fromAttr})`, whereExpr),
      withWhereClause(`replace_pattern(${toAttr}, ${patternLit}, ${replacementLit})`, whereExpr),
    ],
  };
};
