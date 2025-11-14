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
  const sortedNodes = allNodes.sort((a, b) => a.medianPosition - b.medianPosition);

  // Filter out delimiter nodes that are substrings of longer delimiters at the exact same positions
  const filteredNodes = sortedNodes.filter((node, index) => {
    // Check if this node is covered by any other (longer) delimiter at the exact same positions
    return !sortedNodes.some((other, otherIndex) => {
      // Skip self and same-length delimiters
      if (index === otherIndex || node.literal.length >= other.literal.length) {
        return false;
      }

      // Check if node.literal is a substring of other.literal
      // Try all possible substring positions (in case the substring appears multiple times)
      const possibleIndexes: number[] = [];
      let searchStart = 0;
      let foundIndex = other.literal.indexOf(node.literal, searchStart);
      while (foundIndex !== -1) {
        possibleIndexes.push(foundIndex);
        searchStart = foundIndex + 1;
        foundIndex = other.literal.indexOf(node.literal, searchStart);
      }

      if (possibleIndexes.length === 0) {
        return false;
      }

      // Check if this node appears at EXACTLY the same positions as a substring within the other delimiter
      // This means: for EVERY message, node's position must equal other's position + substring offset
      return possibleIndexes.some((substringIndex) => {
        return node.positions.every((nodePos, msgIndex) => {
          const otherPos = other.positions[msgIndex];
          return nodePos === otherPos + substringIndex;
        });
      });
    });
  });

  return filteredNodes;
}
