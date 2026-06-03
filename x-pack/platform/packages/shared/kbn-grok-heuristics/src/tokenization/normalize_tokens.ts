/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GROK_REGEX_MAP, PATTERN_PRECEDENCE } from '../constants';
import type { SingleLineToken, NormalizedToken } from '../types';

/** --------------------------------------------------------------
 *  Helpers
 *  --------------------------------------------------------------*/

/** Built‑in grok patterns we rely on as fall‑backs. */
enum BuiltinPattern {
  DATA = 'DATA',
  NOTSPACE = 'NOTSPACE',
}

/** Resolve the index of a grok pattern, defaulting to 0 if missing. */
const patternIndex = (name: string): number => {
  const idx = PATTERN_PRECEDENCE.indexOf(name);
  return idx === -1 ? 0 : idx;
};

const DATA_IDX = patternIndex(BuiltinPattern.DATA);
const NOTSPACE_IDX = patternIndex(BuiltinPattern.NOTSPACE);

/** Compute the intersection of patterns (and union of exclude patterns) for the given accessor. */
const intersectPatternsBy = (
  lists: SingleLineToken[][],
  accessor: (row: SingleLineToken[]) => SingleLineToken | undefined
) => {
  const first = accessor(lists[0]);
  if (!first) return { patterns: [DATA_IDX], excludedPatterns: [] };
  // Get intersection of patterns across all rows
  const patterns = first.patterns.filter((p) =>
    lists.every((row) => {
      const tok = accessor(row);
      return tok ? tok.patterns.includes(p) : false;
    })
  );
  // Get union of excluded patterns across all rows
  const excludedPatterns: Set<number> = new Set();
  lists.forEach((row) => {
    const tok = accessor(row);
    if (tok) {
      tok.excludedPatterns.forEach((p) => excludedPatterns.add(p));
    }
  });
  return { patterns, excludedPatterns: Array.from(excludedPatterns) };
};

/** Decide if accessor produces a common token across all rows. */
const isCommonTokenBy = (
  lists: SingleLineToken[][],
  accessor: (row: SingleLineToken[]) => SingleLineToken | undefined
): boolean => {
  const firstTok = accessor(lists[0]);
  if (!firstTok) return false;
  return lists.every((row) => {
    const tok = accessor(row);
    if (!tok) return false;
    const valuesEqual = tok.value === firstTok.value;
    const patternsOverlap = firstTok.patterns.some(
      (p) => p < NOTSPACE_IDX && tok.patterns.includes(p)
    );
    return valuesEqual || patternsOverlap;
  });
};

/** Build NormalizedToken for given accessor (gracefully handles shorter rows). */
const buildTokenBy = (
  tokensByRow: SingleLineToken[][],
  accessor: (row: SingleLineToken[]) => SingleLineToken | undefined
): NormalizedToken => {
  const { patterns, excludedPatterns } = intersectPatternsBy(tokensByRow, accessor);
  return {
    patterns,
    excludedPatterns,
    values: tokensByRow.map((row) => accessor(row)?.value ?? ''),
  };
};

/** --------------------------------------------------------------
 *  Public API
 *  --------------------------------------------------------------*/

/**
 * Normalises tokens across multiple log entries for a single column.
 *
 * Strategy (variable‑length aware)
 * --------------------------------
 * 1. Determine the **maximum** row length.  Merging begins with pointers:
 *      leftIdx  = 0
 *      rightOff = 1 (offset from each row's tail)
 * 2. Alternate scanning: left, right, left+1, right+1 …
 *    • Left side uses absolute index (from start).
 *    • Right side uses per‑row negative offset (row.length − rightOff).
 * 3. A side stops when:
 *      • The candidate token is NOT common, OR
 *      • For any row, the candidate index would collide with the other pointer.
 * 4. Residual middle segment is normalised via fixed‑/variable‑length logic.
 */
export function normalizeTokens(tokensPerLine: SingleLineToken[][]): NormalizedToken[] {
  if (tokensPerLine.length === 0) {
    return [];
  }

  let leftIdx = 0; // absolute index from start
  let rightOff = 1; // offset from end (1 == last token)

  const prefix: NormalizedToken[] = [];
  const suffix: NormalizedToken[] = [];

  let scanLeft = true;
  let scanRight = true;

  /** Helper: per‑row right‑hand accessor for current offset. */
  const rightAccessor = (off: number) => (row: SingleLineToken[]) => {
    const idx = row.length - off;
    return idx >= 0 ? row[idx] : undefined;
  };

  while (scanLeft || scanRight) {
    // Prevent overrun: calculate minimal right index across rows.
    const minRightIdx = Math.min(...tokensPerLine.map((row) => row.length - rightOff));
    if (leftIdx > minRightIdx) break; // pointers crossed on at least one row

    // ----- Left scan --------------------------------------------------------
    if (scanLeft) {
      const idx = leftIdx; // freeze index for this iteration
      const leftAcc = (row: SingleLineToken[]) => (idx < row.length ? row[idx] : undefined);
      if (isCommonTokenBy(tokensPerLine, leftAcc)) {
        prefix.push(buildTokenBy(tokensPerLine, leftAcc));
        leftIdx++;
      } else {
        scanLeft = false;
      }
    }

    // stop if both halted or crossed pointers
    if (!scanLeft && !scanRight) break;
    if (!scanLeft && !scanRight) break;

    // update crossing condition again before right scan
    const minRightIdxBeforeRight = Math.min(...tokensPerLine.map((row) => row.length - rightOff));
    if (leftIdx > minRightIdxBeforeRight) break;

    // ----- Right scan -------------------------------------------------------
    if (scanRight) {
      const off = rightOff; // freeze offset for this iteration
      const rAcc = rightAccessor(off);

      // Prevent duplication: if any row's right index <= leftIdx - 1, stop.
      const wouldCollide = tokensPerLine.some((row) => row.length - off <= leftIdx - 1);
      if (wouldCollide) {
        scanRight = false;
      } else if (isCommonTokenBy(tokensPerLine, rAcc)) {
        suffix.unshift(buildTokenBy(tokensPerLine, rAcc));
        rightOff++;
      } else {
        scanRight = false;
      }
    }
  }
  const normalized: NormalizedToken[] = [...prefix];

  // 2. Middle segment(s) ------------------------------------------------------
  const midStart = leftIdx;

  // Determine length of middle per row (exclusive of suffix part)
  const midLens = tokensPerLine.map((row) => Math.max(0, row.length - rightOff + 1 - midStart));
  const hasMiddle = midLens.some((l) => l > 0);
  const fixedLen = hasMiddle && midLens.every((l) => l === midLens[0]);

  if (hasMiddle) {
    if (fixedLen) {
      const len = midLens[0];
      for (let i = 0; i < len; i++) {
        const idx = midStart + i;
        const accessor = (row: SingleLineToken[]) => row[idx];
        normalized.push(buildTokenBy(tokensPerLine, accessor));
      }
    } else {
      const concatenated = tokensPerLine.map((row) => {
        const endIdx = row.length - rightOff + 1;
        return row
          .slice(midStart, endIdx)
          .map((t) => t.value)
          .join('');
      });
      const pattern = concatenated.every((v) => !v.includes(' ')) ? NOTSPACE_IDX : DATA_IDX;
      normalized.push({ patterns: [pattern], excludedPatterns: [], values: concatenated });
    }
  }

  // 3. Append suffix ----------------------------------------------------------
  normalized.push(...suffix);

  /* -----------------------------------------------------------------------
   * 4. Compact adjacent tokens when at least one carries empty values.
   *    This collapses cases where variable‑length rows insert "optional"
   *    tokens that appear as empty strings in shorter rows.
   * ---------------------------------------------------------------------*/
  const compacted: NormalizedToken[] = [];
  for (const tok of normalized) {
    if (
      compacted.length > 0 &&
      (tok.values.some((v) => v === '') ||
        compacted[compacted.length - 1].values.some((v) => v === ''))
    ) {
      const prev = compacted[compacted.length - 1];
      // Concatenate value‑by‑value
      const mergedValues = prev.values.map((v, i) => v + tok.values[i]);
      // Decide pattern (NOTSPACE if no spaces, otherwise DATA)
      const pattern =
        !tok.excludedPatterns.includes(NOTSPACE_IDX) && mergedValues.every((v) => !v.includes(' '))
          ? NOTSPACE_IDX
          : DATA_IDX;
      prev.patterns = [pattern];
      prev.values = mergedValues;
    } else {
      compacted.push(tok);
    }
  }

  // Re-evaluate compacted tokens
  return compacted.map((token): NormalizedToken => {
    const matchingPattern = PATTERN_PRECEDENCE.find((pattern, idx) => {
      return token.values.every((value) => {
        return (
          !token.excludedPatterns.includes(idx) && GROK_REGEX_MAP[pattern].complete.test(value)
        );
      });
    });

    return {
      patterns: matchingPattern ? [PATTERN_PRECEDENCE.indexOf(matchingPattern)] : [DATA_IDX],
      excludedPatterns: token.excludedPatterns,
      values: token.values,
    };
  });
}
