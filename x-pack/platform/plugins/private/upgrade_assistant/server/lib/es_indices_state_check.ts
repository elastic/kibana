/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { getIndexState } from '../../common/get_index_state';
import { ResolveIndexResponseFromES } from '../../common/types';

type StatusCheckResult = Record<string, 'open' | 'closed'>;

export const esIndicesStateCheck = async (
  asCurrentUser: ElasticsearchClient,
  indices: string[]
): Promise<StatusCheckResult> => {
  const resolveIndexPromise = asCurrentUser.indices.resolveIndex({
    name: '*',
    expand_wildcards: 'all',
  });

  const rollupCapsPromise = asCurrentUser.rollup.getRollupCaps();

  const [resolveIndex, rollups] = await Promise.all([resolveIndexPromise, rollupCapsPromise]);
  const rollupIndices = Object.keys(rollups);
  resolveIndex.indices = resolveIndex.indices.filter((index) => !rollupIndices.includes(index.name));

  const result: StatusCheckResult = {};

  indices.forEach((index) => {
    result[index] = getIndexState(index, resolveIndex as ResolveIndexResponseFromES);
  });

  return result;
};
