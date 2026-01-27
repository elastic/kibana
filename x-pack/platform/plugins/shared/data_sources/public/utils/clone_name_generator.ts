/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveSource } from '../types/connector';

// Regex to match names with trailing numbers (e.g., "Github 2", "My Source 5")
const NAME_WITH_NUMBER_PATTERN = /^(.+?)\s+(\d+)$/;

/**
 * Generates a smart clone name by finding the next available number.
 * Only adds a number if there's a naming conflict.
 * If there are gaps in the sequence, it will fill the first available gap.
 *
 * Examples:
 * - "Github" → "Github" (when no "Github" exists)
 * - "Github" → "Github 1" (when "Github" exists)
 * - "Github" → "Github 2" (when "Github" and "Github 1" exist)
 * - "Github 1" → "Github 2" (when "Github 1" exists)
 * - "Github 5" → "Github 1" (when only "Github 5" exists - fills the gap)
 * - "My Source" → "My Source 1" (when "My Source" exists)
 */
export function generateCloneName(originalName: string, existingSources: ActiveSource[]): string {
  // Extract base name from original (e.g., "Github 2" → "Github")
  const match = originalName.match(NAME_WITH_NUMBER_PATTERN);
  const baseName = match ? match[1] : originalName;

  // Single pass through all sources to find taken numbers
  const existingNumbers = new Set<number>();
  existingSources.forEach((source) => {
    // Check if base name exists without a number
    if (source.name === baseName) {
      existingNumbers.add(0);
      return;
    }

    // Check if this source has the same base name with a number
    const sourceMatch = source.name.match(NAME_WITH_NUMBER_PATTERN);
    if (sourceMatch) {
      const sourceBaseName = sourceMatch[1];
      if (sourceBaseName === baseName) {
        existingNumbers.add(parseInt(sourceMatch[2], 10));
      }
    }
  });

  // If no conflicts, return the base name without a number
  if (existingNumbers.size === 0) {
    return baseName;
  }

  // Find next available number (fills gaps if they exist)
  let nextNumber = 1;
  while (existingNumbers.has(nextNumber)) {
    nextNumber++;
  }

  return `${baseName} ${nextNumber}`;
}
