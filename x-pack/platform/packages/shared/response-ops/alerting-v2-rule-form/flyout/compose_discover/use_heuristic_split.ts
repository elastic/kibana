/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';

export type SplitConfidence = 'high' | 'low' | 'none';

export interface SplitResult {
  base: string;
  alertBlock: string;
  confidence: SplitConfidence;
  /**
   * Machine-readable reason for the confidence level, useful for downstream
   * branching without string-matching the human-readable messages.
   *
   * - 'no_stats'        — no STATS segment found; cannot identify a base query
   * - 'no_where'        — STATS found but no WHERE after it; alert block is absent
   * - 'split_succeeded' — both STATS and a post-STATS WHERE were found
   */
  reason: 'no_stats' | 'no_where' | 'split_succeeded';
}

/**
 * Splits an ES|QL query into a base portion and an alert-condition block
 * using the ANTLR-based AST parser from `@elastic/esql`.
 *
 * Strategy: find the last STATS command and the first WHERE after it.
 * Everything up to and including STATS is the base query. Everything from
 * that WHERE onward is the alert block (including its leading pipe).
 *
 * Because splitting is performed against the real AST, pipes inside string
 * literals, comments, or other lexical contexts are handled correctly.
 */
export function splitQuery(query: string): SplitResult {
  if (!query.trim()) {
    return { base: '', alertBlock: '', confidence: 'none', reason: 'no_stats' };
  }

  const { root } = Parser.parse(query);
  const { commands } = root;

  if (commands.length === 0) {
    return { base: '', alertBlock: query.trim(), confidence: 'none', reason: 'no_stats' };
  }

  let lastStatsIdx = -1;
  for (let j = commands.length - 1; j >= 0; j--) {
    if (commands[j].name === 'stats') {
      lastStatsIdx = j;
      break;
    }
  }

  if (lastStatsIdx === -1) {
    return { base: '', alertBlock: query.trim(), confidence: 'none', reason: 'no_stats' };
  }

  let firstWhereAfterStats = -1;
  for (let j = lastStatsIdx + 1; j < commands.length; j++) {
    if (commands[j].name === 'where') {
      firstWhereAfterStats = j;
      break;
    }
  }

  if (firstWhereAfterStats === -1) {
    return { base: query.trim(), alertBlock: '', confidence: 'low', reason: 'no_where' };
  }

  const whereCmd = commands[firstWhereAfterStats];
  const splitPos = query.lastIndexOf('|', whereCmd.location.min);
  const cutAt = splitPos >= 0 ? splitPos : whereCmd.location.min;

  const base = query.slice(0, cutAt).trim();
  const alertBlock = query.slice(cutAt).trim();

  return { base, alertBlock, confidence: 'high', reason: 'split_succeeded' };
}

/**
 * Produces a candidate recovery block from an alert block by performing a
 * naive per-operator flip of comparison operators (`>` ↔ `<`, `>=` ↔ `<=`).
 * Uses a single-pass regex substitution to avoid the double-replacement bug
 * that arises from sequential `.replace()` calls on overlapping patterns
 * (e.g. `>=` being matched by both `>=` and `>`).
 *
 * **Important:** This is NOT a logical negation (De Morgan's law). For
 * compound expressions like `a > 1 AND b < 2`, the true negation would be
 * `a <= 1 OR b >= 2` — but this function produces `a < 1 AND b > 2`
 * (flips each operator independently, preserves AND/OR connectives). For
 * single-condition alert blocks this is usually what users want operationally,
 * and it works well as a starting seed for the Recovery query editor.
 */
export function guessRecoveryBlock(alertBlock: string): string {
  const FLIP: Record<string, string> = { '>=': '<=', '<=': '>=', '>': '<', '<': '>' };
  return alertBlock.replace(/>=|<=|>|</g, (op) => FLIP[op] ?? op);
}
