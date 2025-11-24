/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DelimiterNode } from './types';
import { median, variance } from './utils';

/**
 * Filter out weak single-character delimiters that conflict with stronger multi-character delimiters.
 *
 * A delimiter node conflicts if it represents a single character that appears within or immediately
 * adjacent to a multi-character delimiter.
 *
 * Example: With messages ["short - value", "very long - value"], we find both " " and " - " as delimiters.
 * The delimiter tree might have multiple space nodes:
 * 1. Space at [5,4] - varies because one message has "very long"
 * 2. " - " at [5,9] - the structural delimiter
 * 3. Space at [7,11] - after " - "
 *
 * We want to keep " - " and the space after it, but remove the space node that conflicts with " - ".
 *
 * Algorithm:
 * 1. Identify multi-character delimiters (stronger, more specific)
 * 2. Remove single-char nodes whose positions overlap with or are part of multi-char delimiters
 */
function filterConflictingDelimiters(nodes: DelimiterNode[], messages: string[]): DelimiterNode[] {
  if (nodes.length <= 1) {
    return nodes;
  }

  // Find all multi-character delimiters (stronger, more specific)
  const multiCharDelimiters = nodes.filter((n) => n.literal.length > 1);

  // If no multi-char delimiters, keep everything
  if (multiCharDelimiters.length === 0) {
    return nodes;
  }

  // Filter out single-character delimiter nodes that overlap with multi-char delimiters
  return nodes.filter((node) => {
    // Keep all multi-character delimiters
    if (node.literal.length > 1) {
      return true;
    }

    // For single-char delimiters, check if this specific occurrence conflicts
    // A conflict occurs when the single-char appears at positions that are WITHIN
    // the range of a multi-char delimiter

    const conflictsWithStrongerDelimiter = multiCharDelimiters.some((strongDelim) => {
      // Check if the single char is part of the strong delimiter
      if (!strongDelim.literal.includes(node.literal)) {
        return false; // Not even a substring, no conflict
      }

      // Check how many messages have this node's position overlapping with the strong delimiter
      const overlappingMessages = node.positions.filter((weakPos, idx) => {
        const strongPos = strongDelim.positions[idx];
        const strongEnd = strongPos + strongDelim.literal.length;

        // Check if weak delimiter position falls within the strong delimiter's range
        // or immediately adjacent (which would split it)
        return weakPos >= strongPos && weakPos < strongEnd;
      }).length;

      // If this node overlaps with the strong delimiter in more than half the messages,
      // it's a conflict and should be removed
      return overlappingMessages > messages.length * 0.3;
    });

    return !conflictsWithStrongerDelimiter;
  });
}

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

  // Filter out weak delimiters that would unnecessarily fragment fields
  const nonConflictingNodes = filterConflictingDelimiters(sortedNodes, messages);

  // Filter out delimiter nodes that are substrings of longer delimiters at the exact same positions
  const filteredNodes = nonConflictingNodes.filter((node, index) => {
    // Check if this node is covered by any other (longer) delimiter at the exact same positions
    return !nonConflictingNodes.some((other, otherIndex) => {
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
