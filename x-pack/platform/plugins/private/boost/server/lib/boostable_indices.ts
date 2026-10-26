/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { Index } from '@kbn/index-management-shared-types';

/**
 * Marks which of Index Management's indices search boost applies to, so it only shows boost where
 * it does: Elasticsearch doesn't boost system indices.
 */
export const markBoostableIndices = async (
  indices: Index[],
  client: IScopedClusterClient
): Promise<Index[]> => {
  if (indices.length === 0) {
    return indices;
  }
  const { indices: resolved } = await client.asCurrentUser.indices.resolveIndex({
    name: '*',
    expand_wildcards: 'all',
  });
  const systemIndices = new Set(
    resolved.filter(({ attributes }) => attributes.includes('system')).map(({ name }) => name)
  );
  return indices.map((index) => ({ ...index, isBoostable: !systemIndices.has(index.name) }));
};
