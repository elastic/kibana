/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a message with normalized whitespace and tracking info
 */
export interface NormalizedMessage {
  /** The message with consecutive whitespace collapsed to single spaces */
  normalized: string;
  /**
   * Map of original position to (original char, normalized position)
   * Used to map positions in normalized string back to original
   */
  positionMap: Array<{ originalChar: string; normalizedPos: number }>;
  /**
   * Positions in the NORMALIZED string where whitespace was collapsed.
   * These positions mark where the collapsed whitespace started (before the field content).
   */
  collapsedWhitespacePositions: number[];
}

/**
 * Normalize consecutive SPACES (not tabs) in messages to single spaces.
 *
 * This fixes the core issue where varying amounts of spaces between fields
 * (e.g., "INFO   -" vs "WARN -" vs "ERROR  -") cause delimiter detection to fail
 * because delimiters appear at different positions.
 *
 * IMPORTANT: Tabs are NOT normalized because they are often used as actual
 * delimiters in tab-delimited formats. Only consecutive SPACES are collapsed.
 *
 * After normalization, all delimiters align at consistent positions, allowing
 * the existing algorithm to work. Fields that had trailing whitespace are marked
 * for right-padding modifiers.
 *
 * Example:
 *   Input:  "INFO   - - [date]"  (3 spaces after INFO)
 *           "WARN - - [date]"    (1 space after WARN)
 *           "ERROR  - - [date]"  (2 spaces after ERROR)
 *
 *   Output: "INFO - - [date]"    (marked: field_1 needs right-padding)
 *           "WARN - - [date]"    (no marker)
 *           "ERROR - - [date]"   (marked: field_1 needs right-padding)
 */
export function normalizeWhitespace(messages: string[]): NormalizedMessage[] {
  return messages.map((message) => {
    const normalized: string[] = [];
    const positionMap: Array<{ originalChar: string; normalizedPos: number }> = [];
    const collapsedWhitespacePositions: number[] = [];

    let i = 0;
    while (i < message.length) {
      const char = message[i];

      // Check if this is the start of SPACE characters (NOT tabs)
      // Tabs are preserved as-is since they're often used as delimiters
      if (char === ' ') {
        // Collect all consecutive SPACES (not tabs)
        const whitespaceStart = i;
        let whitespaceEnd = i;
        while (whitespaceEnd < message.length && message[whitespaceEnd] === ' ') {
          whitespaceEnd++;
        }

        // Add single space to normalized string
        const normalizedPos = normalized.length;
        normalized.push(' ');

        // Track position mapping for all original whitespace characters
        for (let j = whitespaceStart; j < whitespaceEnd; j++) {
          positionMap.push({
            originalChar: message[j],
            normalizedPos,
          });
        }

        // If we collapsed multiple whitespace chars, mark this position
        if (whitespaceEnd - whitespaceStart > 1) {
          // Record the normalized position where the collapsed whitespace starts
          collapsedWhitespacePositions.push(normalizedPos);
        }

        i = whitespaceEnd;
      } else {
        // Regular character - add to normalized and track position
        normalized.push(char);
        positionMap.push({
          originalChar: char,
          normalizedPos: normalized.length - 1,
        });
        i++;
      }
    }

    return {
      normalized: normalized.join(''),
      positionMap,
      collapsedWhitespacePositions,
    };
  });
}

/**
 * Map a position in the normalized string back to the original position.
 * Used to map delimiter positions after normalization back to original messages.
 */
export function mapNormalizedToOriginalPosition(
  normalizedPos: number,
  positionMap: NormalizedMessage['positionMap']
): number {
  // Find the first mapping that has this normalized position
  for (let i = 0; i < positionMap.length; i++) {
    if (positionMap[i].normalizedPos === normalizedPos) {
      return i;
    }
  }
  return -1; // Not found
}

/**
 * Check if a delimiter at specific positions corresponds to collapsed whitespace.
 * A field needs right-padding if the delimiter after it starts at a position
 * where whitespace was collapsed in ANY message.
 *
 * @param delimiterPositions - Array of positions where the delimiter appears (one per message)
 * @param normalizedMessages - Array of normalized message data
 * @returns true if the field before this delimiter needs right-padding modifier
 */
export function needsRightPadding(
  delimiterPositions: number[],
  normalizedMessages: NormalizedMessage[]
): boolean {
  if (delimiterPositions.length !== normalizedMessages.length) {
    return false;
  }

  // Check if ANY message had collapsed whitespace at the delimiter position
  for (let i = 0; i < normalizedMessages.length; i++) {
    const delimiterPos = delimiterPositions[i];
    const collapsedPositions = normalizedMessages[i].collapsedWhitespacePositions;

    // If the delimiter starts at a position where whitespace was collapsed,
    // then the field before it had varying width and needs right-padding
    if (collapsedPositions.includes(delimiterPos)) {
      return true;
    }
  }

  return false;
}
