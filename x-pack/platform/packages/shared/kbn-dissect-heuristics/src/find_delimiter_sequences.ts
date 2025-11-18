/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DelimiterDetectionConfig } from './types';
import {
  extractSubstrings,
  isLikelyDelimiter,
  scoreDelimiterQuality,
  countOccurrences,
  calculatePositionScore,
} from './utils';

interface DelimiterCandidate {
  literal: string;
  frequency: number;
  positions: number[];
  score: number;
}

/**
 * Find common delimiter sequences that appear in all messages
 *
 * Algorithm:
 * 1. Extract all substrings from all messages (length 1-10 chars)
 * 2. Filter to substrings that appear in ALL messages
 * 3. Filter out purely alphanumeric substrings (likely data, not delimiters)
 * 4. For each delimiter, find ALL occurrences in each message
 * 5. Score EACH occurrence separately by position consistency
 * 6. Keep delimiters where ANY occurrence meets the minimum score threshold
 * 7. Return unique delimiter literals (buildDelimiterTree will handle multiple occurrences)
 */
export function findDelimiterSequences(
  messages: string[],
  config?: DelimiterDetectionConfig
): string[] {
  const {
    minLength = 1,
    maxLength = 10,
    minFrequency = messages.length, // Must appear in all messages by default
    minScore = 0.3,
  } = config || {};

  if (messages.length === 0) {
    return [];
  }

  if (messages.length === 1) {
    // For single message, extract likely delimiters and score them
    const substrings = extractSubstrings(messages[0], minLength, maxLength);
    const likelyDelimiters = substrings.filter(isLikelyDelimiter);

    // Score and sort by quality (prefer multi-char and structural delimiters)
    const scoredDelimiters = likelyDelimiters.map((delimiter) => ({
      delimiter,
      score: scoreDelimiterQuality(delimiter),
    }));

    scoredDelimiters.sort((a, b) => b.score - a.score);

    // Take top 20, but filter out single spaces if we have better alternatives
    const topDelimiters = scoredDelimiters.slice(0, 30).map((d) => d.delimiter);
    const hasBetterThanSpace = topDelimiters.some(
      (d) => d !== ' ' && scoreDelimiterQuality(d) > 10
    );

    if (hasBetterThanSpace) {
      // Filter out single spaces to reduce fragmentation
      return topDelimiters.filter((d) => d !== ' ').slice(0, 20);
    }

    return topDelimiters.slice(0, 20);
  }

  // Step 1: Extract all possible substrings from first message as candidates
  const candidates = new Set<string>(extractSubstrings(messages[0], minLength, maxLength));

  // Step 2: Filter to substrings that appear in enough messages
  const commonSubstrings = Array.from(candidates).filter((substring) => {
    const occurrences = countOccurrences(messages, substring);
    return occurrences >= minFrequency;
  });

  // Step 3: Filter to likely delimiters
  const likelyDelimiters = commonSubstrings.filter(isLikelyDelimiter);

  // No bracket scoring heuristics: keep logic minimal; rely only on position score + symmetry cleanup

  // Step 4: Score each delimiter by ALL occurrences, not just the first
  // This ensures delimiters with consistent 2nd/3rd occurrences aren't filtered out
  const scoredDelimiters: DelimiterCandidate[] = [];

  for (const delimiter of likelyDelimiters) {
    // Find ALL positions of this delimiter in each message (like buildDelimiterTree does)
    const allPositionsPerMessage = messages.map((msg) => {
      const positions: number[] = [];
      let index = msg.indexOf(delimiter);
      while (index !== -1) {
        positions.push(index);
        index = msg.indexOf(delimiter, index + delimiter.length);
      }
      return positions;
    });

    // Find the maximum number of occurrences across all messages
    const maxOccurrences = Math.max(...allPositionsPerMessage.map((p) => p.length));

    // Score each occurrence separately
    for (let occIndex = 0; occIndex < maxOccurrences; occIndex++) {
      const positions = allPositionsPerMessage.map((posArray) =>
        posArray[occIndex] !== undefined ? posArray[occIndex] : -1
      );

      // Only consider this occurrence if it exists in all messages
      if (!positions.some((pos) => pos === -1)) {
        // Score purely on positional consistency.
        const score = calculatePositionScore(positions);

        // Only add this occurrence if it meets the minimum score
        if (score >= minScore) {
          scoredDelimiters.push({
            literal: delimiter,
            frequency: countOccurrences(messages, delimiter),
            positions,
            score,
          });
        }
      }
    }
  }

  // Step 5: Sort by score, then length, then frequency
  const validDelimiters = scoredDelimiters.sort((a, b) => {
    // Sort by score first (higher is better)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Then by length (longer delimiters are more specific)
    if (b.literal.length !== a.literal.length) {
      return b.literal.length - a.literal.length;
    }
    // Then by frequency
    return b.frequency - a.frequency;
  });

  // Remove delimiters that are substrings of other delimiters with same positions
  // Process longer delimiters first to ensure they are kept over their substrings
  const sortedByLength = [...validDelimiters].sort((a, b) => b.literal.length - a.literal.length);
  const filteredDelimiters = removeDuplicateSubstrings(sortedByLength);

  // Return unique delimiter literals (may have multiple occurrences, but buildDelimiterTree handles that)
  let uniqueDelimiters = Array.from(new Set(filteredDelimiters.map((d) => d.literal)));
  // Consolidated bracket sanitization:
  // 1. Remove delimiters that contain unbalanced bracket types (entire delimiter removal)
  // 2. Detect mixed bracket characters (per-message stack mismatches)
  // 3. Detect cluster patterns (closing immediately followed by different opening inside same delimiter)
  // 4. Detect cross-delimiter ordering mismatches (median-order stack scan)
  // 5. Strip all bracket characters flagged by 2–4 in a single pass

  // (1) Unbalanced pair whole-delimiter removal
  const bracketPairs: Array<[string, string]> = [
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
  ];
  for (const [open, close] of bracketPairs) {
    const hasOpen = uniqueDelimiters.some((d) => d.includes(open));
    const hasClose = uniqueDelimiters.some((d) => d.includes(close));
    if (hasOpen && !hasClose) {
      uniqueDelimiters = uniqueDelimiters.filter((d) => !d.includes(open));
    } else if (hasClose && !hasOpen) {
      uniqueDelimiters = uniqueDelimiters.filter((d) => !d.includes(close));
    }
  }

  // Precompute occurrences for subsequent analyses
  const delimiterOccurrencesPerMessage = messages.map((msg) => {
    const occurrences: Array<{ pos: number; literal: string }> = [];
    for (const delim of uniqueDelimiters) {
      let idx = msg.indexOf(delim);
      while (idx !== -1) {
        occurrences.push({ pos: idx, literal: delim });
        idx = msg.indexOf(delim, idx + delim.length);
      }
    }
    occurrences.sort((a, b) => a.pos - b.pos);
    return occurrences;
  });

  const openerFor: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const closerFor: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const mixedBracketChars = new Set<string>();

  // (2) Mixed bracket detection (stack mismatches within messages)
  for (const occ of delimiterOccurrencesPerMessage) {
    const stack: string[] = [];
    for (const { literal } of occ) {
      for (const ch of literal) {
        if (closerFor[ch]) {
          stack.push(ch); // opener
        } else if (openerFor[ch]) {
          if (stack.length === 0) {
            mixedBracketChars.add(ch);
          } else {
            const top = stack[stack.length - 1];
            if (openerFor[ch] !== top) {
              mixedBracketChars.add(ch);
              mixedBracketChars.add(top);
              stack.pop();
            } else {
              stack.pop();
            }
          }
        }
      }
    }
    for (const remaining of stack) mixedBracketChars.add(remaining);
  }

  // (3) Cluster pattern detection: mark bracket chars in such delimiters
  const clusterPattern = /[)\]}][({\[]/;
  const clusterChars = new Set<string>();
  for (const d of uniqueDelimiters) {
    if (clusterPattern.test(d)) {
      for (const ch of d) if ('()[]{}'.includes(ch)) clusterChars.add(ch);
    }
  }

  // (4) Cross-delimiter mismatch ordering scan (median ordering)
  const orderedForScan = uniqueDelimiters
    .map((lit) => {
      const positions = messages.map((msg) => msg.indexOf(lit));
      const sorted = [...positions].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      return { lit, median };
    })
    .sort((a, b) => a.median - b.median);

  const crossMismatchChars = new Set<string>();
  const bracketOpeners = new Set(['(', '[', '{']);
  const bracketClosers: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const openerStack: string[] = [];
  for (const { lit } of orderedForScan) {
    for (const ch of lit) {
      if (bracketOpeners.has(ch)) {
        openerStack.push(ch);
      } else if (bracketClosers[ch]) {
        const expected = bracketClosers[ch];
        const top = openerStack[openerStack.length - 1];
        if (!top || top !== expected) {
          crossMismatchChars.add(ch);
          if (top && top !== expected) {
            crossMismatchChars.add(top);
            openerStack.pop();
          }
        } else {
          openerStack.pop();
        }
      }
    }
  }
  for (const remaining of openerStack) crossMismatchChars.add(remaining);

  // (5) Single sanitization pass stripping bracket chars flagged by (2)-(4)
  const charsToStrip = new Set<string>([
    ...mixedBracketChars,
    ...clusterChars,
    ...crossMismatchChars,
  ]);

  if (charsToStrip.size) {
    uniqueDelimiters = uniqueDelimiters
      .map((d) => {
        const sanitized = [...d]
          .filter((c) => !('()[]{}'.includes(c) && charsToStrip.has(c)))
          .join('');
        return sanitized;
      })
      .filter((d) => d.length > 0);
    uniqueDelimiters = Array.from(new Set(uniqueDelimiters));
  }

  return uniqueDelimiters;
}

/**
 * Remove delimiter candidates that are substrings of other delimiters
 * occurring at the same positions
 */
function removeDuplicateSubstrings(candidates: DelimiterCandidate[]): DelimiterCandidate[] {
  const result: DelimiterCandidate[] = [];

  for (const candidate of candidates) {
    // Check if this candidate is a substring of an already added delimiter
    // at the same positions
    const isDuplicate = result.some((existing) => {
      // Check if candidate is a substring of existing
      const substringIndex = existing.literal.indexOf(candidate.literal);
      if (substringIndex === -1) {
        return false;
      }

      // Check if candidate positions match existing positions + offset
      // For each position of the candidate, check if there's a corresponding existing position
      // where the candidate would appear within the existing delimiter
      const positionsMatch = candidate.positions.every((candidatePos) => {
        return existing.positions.some((existingPos) => {
          return candidatePos === existingPos + substringIndex;
        });
      });

      return positionsMatch;
    });

    if (!isDuplicate) {
      result.push(candidate);
    }
  }

  return result;
}
