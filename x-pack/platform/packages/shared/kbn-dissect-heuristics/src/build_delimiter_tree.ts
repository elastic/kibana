/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DelimiterNode } from './types';
import { median, variance } from './utils';

/**
 * Build an ordered delimiter tree by finding positions and ordering by median position
 *
 * Algorithm:
 * 1. Find ALL positions of each delimiter in each message
 * 2. Group by occurrence index (1st occurrence, 2nd occurrence, etc.)
 * 3. Calculate median position across all messages for each occurrence
 * 4. Calculate variance to measure position consistency
 * 5. Sort by median position (left to right)
 * 6. Filter out delimiters with too much position variance (optional)
 */
export function buildDelimiterTree(
  messages: string[],
  delimiters: string[],
  maxVariance: number = Infinity
): DelimiterNode[] {
  if (messages.length === 0 || delimiters.length === 0) {
    return [];
  }

  const allNodes: DelimiterNode[] = [];

  // Process each delimiter
  for (const delimiter of delimiters) {
    // Find ALL positions of this delimiter in each message
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

    // Create a node for each occurrence index (if it exists in all messages)
    for (let occIndex = 0; occIndex < maxOccurrences; occIndex++) {
      const positions = allPositionsPerMessage.map((posArray) =>
        posArray[occIndex] !== undefined ? posArray[occIndex] : -1
      );

      // Only create node if this occurrence exists in all messages
      if (!positions.some((pos) => pos === -1)) {
        const medianPos = median(positions);
        const posVariance = variance(positions);

        // Skip if variance too high
        if (posVariance <= maxVariance) {
          allNodes.push({
            literal: delimiter,
            positions,
            medianPosition: medianPos,
            variance: posVariance,
          });
        }
      }
    }
  }

  // Sort by median position (left to right in the message)
  return allNodes.sort((a, b) => a.medianPosition - b.medianPosition);
}
