/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

export interface SplitResult {
  base: string;
  alertBlock: string;
  confidence: 'high' | 'low' | 'none';
}

/**
 * Splits an ES|QL query into base and alert block using pipe-segment analysis.
 *
 * Strategy: find the last STATS segment and the first WHERE after it.
 * Everything up to and including STATS is the base query. Everything from
 * the first WHERE onward is the alert block.
 *
 * Handles both multi-line and single-line queries by operating on pipe
 * segments rather than lines.
 */
export function splitQuery(query: string): SplitResult {
  if (!query.trim()) {
    return { base: '', alertBlock: '', confidence: 'none' };
  }

  const segments: Array<{ text: string; start: number; end: number; keyword: string }> = [];
  let current = '';
  let segStart = 0;

  for (let i = 0; i <= query.length; i++) {
    if (i === query.length || query[i] === '|') {
      if (current.trim()) {
        const trimmed = current.trim();
        const keyword = trimmed.split(/\s+/)[0].toUpperCase();
        segments.push({ text: current, start: segStart, end: i, keyword });
      }
      current = '';
      segStart = i + 1;
    } else {
      current += query[i];
    }
  }

  if (segments.length === 0) {
    return { base: query, alertBlock: '', confidence: 'none' };
  }

  let lastStatsIdx = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].keyword === 'STATS') {
      lastStatsIdx = i;
      break;
    }
  }

  if (lastStatsIdx === -1) {
    return { base: '', alertBlock: query.trim(), confidence: 'none' };
  }

  let firstWhereAfterStats = -1;
  for (let i = lastStatsIdx + 1; i < segments.length; i++) {
    if (segments[i].keyword === 'WHERE') {
      firstWhereAfterStats = i;
      break;
    }
  }

  if (firstWhereAfterStats === -1) {
    return { base: query.trim(), alertBlock: '', confidence: 'low' };
  }

  // segments[].start is the position AFTER the preceding |, so back up to
  // include the pipe itself in the alert block.
  const afterPipe = segments[firstWhereAfterStats].start;
  const pipePos = query.lastIndexOf('|', afterPipe);
  const splitPos = pipePos >= 0 ? pipePos : afterPipe;

  const base = query.slice(0, splitPos).trim();
  const alertBlock = query.slice(splitPos).trim();

  return { base, alertBlock, confidence: 'high' };
}

export const useHeuristicSplit = (fullQuery: string): SplitResult => {
  return useMemo(() => splitQuery(fullQuery), [fullQuery]);
};
