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
  countOccurrences,
  findPosition,
  calculatePositionScore,
  containsIPAddress,
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
 * 4. Score by consistency of position across messages
 * 5. Return top-scored candidates
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
    // For single message, extract likely delimiters
    const substrings = extractSubstrings(messages[0], minLength, maxLength);
    return substrings.filter(isLikelyDelimiter).slice(0, 20);
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

  // Step 4: Score each delimiter by position consistency
  const scoredDelimiters: DelimiterCandidate[] = likelyDelimiters.map((delimiter) => {
    const positions = messages.map((msg) => findPosition(msg, delimiter));
    const score = calculatePositionScore(positions);
    const frequency = countOccurrences(messages, delimiter);

    // Apply penalty for delimiters that appear multiple times in the same message
    // BUT only if the messages contain IP addresses (to avoid penalizing CSV/pipe delimiters)
    let multipleOccurrencePenalty = 1.0;

    const hasMultipleOccurrences = messages.some((msg) => {
      const occurrences = msg.split(delimiter).length - 1;
      return occurrences > 1;
    });

    if (hasMultipleOccurrences) {
      // Only penalize if messages contain IP addresses (likely the delimiter is '.' or ':')
      const messagesHaveIPs = messages.some((msg) => containsIPAddress(msg));
      if (messagesHaveIPs && (delimiter === '.' || delimiter === ':')) {
        multipleOccurrencePenalty = 0.3;
      }
    }

    return {
      literal: delimiter,
      frequency,
      positions,
      score: score * multipleOccurrencePenalty,
    };
  });

  // Step 5: Filter by score and variance, then sort by score
  const validDelimiters = scoredDelimiters
    .filter((d) => d.score >= minScore)
    .sort((a, b) => {
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
  const filteredDelimiters = removeDuplicateSubstrings(validDelimiters);

  return filteredDelimiters.map((d) => d.literal);
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
      if (!existing.literal.includes(candidate.literal)) {
        return false;
      }

      // Check if positions are the same or very close
      const positionsMatch = candidate.positions.every((pos, idx) => {
        const existingPos = existing.positions[idx];
        return Math.abs(pos - existingPos) <= existing.literal.indexOf(candidate.literal);
      });

      return positionsMatch;
    });

    if (!isDuplicate) {
      result.push(candidate);
    }
  }

  return result;
}
