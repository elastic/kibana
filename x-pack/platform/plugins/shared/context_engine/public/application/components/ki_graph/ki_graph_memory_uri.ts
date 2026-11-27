/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KI_GRAPH_MEMORY_URI_PREFIX = 'ki://';

export const getMemoryIdsFromKiUris = (uris: readonly string[]): string[] => {
  const ids: string[] = [];
  for (const uri of uris) {
    if (!uri.startsWith(KI_GRAPH_MEMORY_URI_PREFIX)) {
      continue;
    }
    const memoryId = uri.slice(KI_GRAPH_MEMORY_URI_PREFIX.length);
    if (memoryId.length === 0) {
      continue;
    }
    ids.push(memoryId);
  }
  return ids;
};
