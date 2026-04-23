/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppendProcessor } from '../../../../types/processors';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlLiteralFromAny, ottlStringLiteral, withWhereClause } from './common';

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Emits one `append(log.attributes["to"], value)` statement per entry in the
 * `value` array. OTTL's `append` creates the array if the target is absent.
 *
 * `allow_duplicates: false` approximation: a `where not (IsMatch(...))` guard
 * checks whether the JSON representation of the value already appears in the
 * `String()` rendering of the attribute. This is the same fragile regex approach
 * used by the `includes` condition — values containing regex metacharacters can
 * produce false positives. A warning is emitted when this guard is active.
 *
 * Multi-format semantics under `error_mode: propagate`: because each statement
 * is independent and unconditional (except for the dedup guard), propagate mode
 * is safe here — no statement fails unless `where` evaluation itself errors.
 */
export const convertAppendProcessorToOtel = (
  processor: AppendProcessor
): { emission: Emission; warnings: string[] } => {
  const { to, value, allow_duplicates = true, where } = processor;
  const toAttr = attributePath(to);

  const warnings: string[] = [];
  if (!allow_duplicates) {
    warnings.push(
      `append to field "${to}" with allow_duplicates: false uses regex matching against the ` +
        `array's string representation. Values containing regex metacharacters may produce ` +
        `incorrect duplicate checks.`
    );
  }

  const statements: string[] = [];
  for (const v of value) {
    const literal = ottlLiteralFromAny(v);

    const whereParts: string[] = [];
    if (where) whereParts.push(conditionToOttl(where));
    if (!allow_duplicates) {
      const jsonEncoded = JSON.stringify(v);
      whereParts.push(`not (IsMatch(String(${toAttr}), ${ottlStringLiteral(escapeRegex(jsonEncoded))}))`);
    }

    const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;
    statements.push(withWhereClause(`append(${toAttr}, ${literal})`, whereExpr));
  }

  return { emission: { kind: 'transform', statements }, warnings };
};
