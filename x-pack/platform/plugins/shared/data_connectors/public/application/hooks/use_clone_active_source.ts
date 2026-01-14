/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryClient } from '@kbn/react-query';
import { queryKeys } from '../query_keys';
import type { ActiveSource } from '../../types/connector';

/**
 * Generates a smart clone name by incrementing numbers
 * Examples:
 * - "Github" → "Github 1"
 * - "Github 1" → "Github 2"
 * - "My Source" → "My Source 1"
 * - "My Source 5" → "My Source 6"
 *
 * Optimized for performance with Set for O(1) lookups
 */
export function generateCloneName(originalName: string, existingSources: ActiveSource[]): string {
  // Extract base name from original (e.g., "Github 2" → "Github")
  const match = originalName.match(/^(.+?)\s+(\d+)$/);
  const baseName = match ? match[1] : originalName;

  // Single pass through all sources to find taken numbers - O(n)
  const existingNumbers = new Set<number>();
  existingSources.forEach((source) => {
    // Check if base name exists without a number
    if (source.name === baseName) {
      existingNumbers.add(0);
      return;
    }

    // Check if this source has the same base name with a number
    const sourceMatch = source.name.match(/^(.+?)\s+(\d+)$/);
    if (sourceMatch) {
      const sourceBaseName = sourceMatch[1];
      if (sourceBaseName === baseName) {
        existingNumbers.add(parseInt(sourceMatch[2], 10));
      }
    }
  });

  // Find next available number using Set for O(1) lookups
  let nextNumber = 1;
  while (existingNumbers.has(nextNumber)) {
    nextNumber++;
  }

  return `${baseName} ${nextNumber}`;
}

/**
 * Hook to get clone information for a source
 * Returns the suggested clone name based on existing sources
 */
export function useCloneActiveSource() {
  const queryClient = useQueryClient();

  const getCloneName = (sourceToClone: ActiveSource): string => {
    const allSources = queryClient.getQueryData<{ connectors: ActiveSource[] }>(
      queryKeys.dataConnectors.list()
    );

    return generateCloneName(sourceToClone.name, allSources?.connectors ?? []);
  };

  return { getCloneName };
}
