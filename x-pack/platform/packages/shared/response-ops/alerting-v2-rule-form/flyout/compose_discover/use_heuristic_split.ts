/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

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
 * Tokenises an ES|QL query into pipe-delimited segments, skipping pipes that
 * appear inside single-quoted ('…') or triple-quoted ('''…''') string literals.
 *
 * Returns an array of { text, start, keyword } where:
 *   text    — the raw text of the segment (excluding the leading |)
 *   start   — the index in `query` just after the preceding '|' (or 0 for the first)
 *   keyword — the uppercased first word of `text.trim()`
 */
function tokeniseSegments(query: string): Array<{ text: string; start: number; keyword: string }> {
  const segments: Array<{ text: string; start: number; keyword: string }> = [];
  let current = '';
  let segStart = 0;
  let inSingleQuote = false;
  let i = 0;

  while (i <= query.length) {
    if (i === query.length) {
      if (current.trim()) {
        const keyword = current.trim().split(/\s+/)[0].toUpperCase();
        segments.push({ text: current, start: segStart, keyword });
      }
      break;
    }

    const ch = query[i];

    if (!inSingleQuote && ch === "'") {
      // Check for triple-quoted string opener: '''
      if (query[i + 1] === "'" && query[i + 2] === "'") {
        inSingleQuote = true;
        current += "'''";
        i += 3;
        // Consume until closing '''
        while (i < query.length) {
          if (query[i] === "'" && query[i + 1] === "'" && query[i + 2] === "'") {
            current += "'''";
            i += 3;
            inSingleQuote = false;
            break;
          }
          current += query[i];
          i++;
        }
        continue;
      }
      // Single-quoted string
      inSingleQuote = true;
      current += ch;
      i++;
      continue;
    }

    if (inSingleQuote && ch === "'") {
      inSingleQuote = false;
      current += ch;
      i++;
      continue;
    }

    if (!inSingleQuote && ch === '|') {
      if (current.trim()) {
        const keyword = current.trim().split(/\s+/)[0].toUpperCase();
        segments.push({ text: current, start: segStart, keyword });
      }
      current = '';
      segStart = i + 1;
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  return segments;
}

/**
 * Splits an ES|QL query into a base portion and an alert-condition block.
 *
 * Strategy: find the last STATS segment and the first WHERE after it.
 * Everything up to and including STATS is the base query. Everything from
 * that WHERE onward is the alert block (including its leading pipe).
 *
 * Correctly handles:
 *  - Single-line and multi-line queries (operates on pipe segments, not lines)
 *  - Pipes inside single-quoted and triple-quoted string literals
 *  - EVAL / KEEP / DROP segments between STATS and WHERE
 */
export function splitQuery(query: string): SplitResult {
  if (!query.trim()) {
    return { base: '', alertBlock: '', confidence: 'none', reason: 'no_stats' };
  }

  const segments = tokeniseSegments(query);

  if (segments.length === 0) {
    return { base: query, alertBlock: '', confidence: 'none', reason: 'no_stats' };
  }

  let lastStatsIdx = -1;
  for (let j = segments.length - 1; j >= 0; j--) {
    if (segments[j].keyword === 'STATS') {
      lastStatsIdx = j;
      break;
    }
  }

  if (lastStatsIdx === -1) {
    return { base: '', alertBlock: query.trim(), confidence: 'none', reason: 'no_stats' };
  }

  let firstWhereAfterStats = -1;
  for (let j = lastStatsIdx + 1; j < segments.length; j++) {
    if (segments[j].keyword === 'WHERE') {
      firstWhereAfterStats = j;
      break;
    }
  }

  if (firstWhereAfterStats === -1) {
    return { base: query.trim(), alertBlock: '', confidence: 'low', reason: 'no_where' };
  }

  // segments[].start is the position AFTER the preceding |, so back up one
  // character to include the pipe itself in the alert block.
  const afterPipe = segments[firstWhereAfterStats].start;
  const pipePos = query.lastIndexOf('|', afterPipe);
  const splitPos = pipePos >= 0 ? pipePos : afterPipe;

  const base = query.slice(0, splitPos).trim();
  const alertBlock = query.slice(splitPos).trim();

  return { base, alertBlock, confidence: 'high', reason: 'split_succeeded' };
}

/**
 * Produces a candidate recovery block from an alert block by inverting the
 * primary comparison operator. Uses a single-pass regex substitution to avoid
 * the double-replacement bug that arises from sequential .replace() calls on
 * overlapping patterns (e.g. >= being matched by both >= and >).
 *
 * This is intentionally a heuristic seed — users are expected to refine the
 * generated block in the Recovery query editor.
 */
export function guessRecoveryBlock(alertBlock: string): string {
  const FLIP: Record<string, string> = { '>=': '<=', '<=': '>=', '>': '<', '<': '>' };
  return alertBlock.replace(/>=|<=|>|</g, (op) => FLIP[op] ?? op);
}

export const useHeuristicSplit = (fullQuery: string): SplitResult => {
  return useMemo(() => splitQuery(fullQuery), [fullQuery]);
};
