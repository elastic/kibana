/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetVersion } from '../types';

/**
 * Creates a new dataset version entry.
 */
export const createVersion = (
  datasetId: string,
  mutationType: DatasetVersion['mutationType'],
  exampleIds: string[],
  options?: { tag?: string; metadata?: Record<string, unknown> }
): DatasetVersion => ({
  datasetId,
  timestamp: new Date().toISOString(),
  mutationType,
  exampleIds,
  tag: options?.tag,
  metadata: options?.metadata,
});

/**
 * Finds the version matching a specific tag.
 */
export const findVersionByTag = (
  versions: DatasetVersion[],
  tag: string
): DatasetVersion | undefined => {
  return versions.find((v) => v.tag === tag);
};

/**
 * Returns versions sorted newest-first.
 */
export const sortVersionsDescending = (versions: DatasetVersion[]): DatasetVersion[] => {
  return [...versions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

/**
 * Computes the cumulative set of example IDs at a given point in time
 * by replaying the version history.
 */
export const resolveExampleIdsAtVersion = (
  versions: DatasetVersion[],
  upToTimestamp: string
): Set<string> => {
  const sorted = [...versions]
    .filter((v) => new Date(v.timestamp).getTime() <= new Date(upToTimestamp).getTime())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const ids = new Set<string>();

  for (const version of sorted) {
    switch (version.mutationType) {
      case 'create':
      case 'add':
        for (const id of version.exampleIds) {
          ids.add(id);
        }
        break;
      case 'remove':
        for (const id of version.exampleIds) {
          ids.delete(id);
        }
        break;
      case 'update':
        // Updates don't change membership, just content
        break;
    }
  }

  return ids;
};
