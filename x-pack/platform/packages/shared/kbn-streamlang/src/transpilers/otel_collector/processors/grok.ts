/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokProcessor } from '../../../../types/processors';
import { unwrapPatternDefinitions } from '../../../../types/utils/grok_pattern_definitions';
import { conditionToOttl } from '../condition_to_ottl';
import type { Emission } from '../emission';
import { attributePath, ottlStringLiteral, withWhereClause } from './common';

/**
 * Emits one OTTL statement per grok pattern:
 *   `merge_maps(log.attributes,
 *     ExtractGrokPatterns(log.attributes["<from>"], "<pattern>", true),
 *     "upsert") where <cond>`
 *
 * Semantics vs. ingest grok:
 * - Ingest grok tries each pattern until one matches, then stops. OTTL
 *   ExtractGrokPatterns takes a single pattern; we emit one statement per
 *   pattern. If an earlier pattern already populated the expected fields, a
 *   later one may overwrite them — this is a lossy area and is flagged in the
 *   transpiler warnings for multi-pattern inputs.
 * - Named captures flow into `log.attributes` directly via `merge_maps`, which
 *   is usable as a top-level OTTL statement (docs: "merge_maps is a special
 *   case of the set function").
 * - `pattern_definitions` is inlined into each pattern string via the shared
 *   `unwrapPatternDefinitions` helper (same approach as the ES|QL transpiler),
 *   so the emitted OTTL is self-contained and doesn't require the collector
 *   to support `ExtractGrokPatterns`'s 4th (definitions) argument.
 */
export const convertGrokProcessorToOtel = (
  processor: GrokProcessor
): { emission: Emission; warnings: string[] } => {
  const { from, patterns, ignore_missing = false, where } = processor;
  const fromAttr = attributePath(from);

  const whereParts: string[] = [];
  if (where) whereParts.push(conditionToOttl(where));
  if (!ignore_missing) whereParts.push(`${fromAttr} != nil`);
  const whereExpr = whereParts.length ? whereParts.map((p) => `(${p})`).join(' and ') : undefined;

  const warnings: string[] = [];
  if (patterns.length > 1) {
    warnings.push(
      `grok processor on field "${from}" uses ${patterns.length} patterns; OTTL evaluates them sequentially and later matches overwrite earlier ones (ingest grok stops at first match).`
    );
  }

  const expandedPatterns = unwrapPatternDefinitions(processor);

  const statements = expandedPatterns.map((pattern) =>
    withWhereClause(
      `merge_maps(log.attributes, ExtractGrokPatterns(${fromAttr}, ${ottlStringLiteral(
        pattern
      )}, true), "upsert")`,
      whereExpr
    )
  );

  return {
    emission: { kind: 'transform', statements },
    warnings,
  };
};
