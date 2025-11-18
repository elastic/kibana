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
  const uniqueDelimiters = Array.from(new Set(filteredDelimiters.map((d) => d.literal)));

  // Return unique delimiters; bracket mismatch filtering happens later in the pipeline.
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
