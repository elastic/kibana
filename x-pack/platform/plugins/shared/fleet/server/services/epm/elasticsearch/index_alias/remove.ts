/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import pMap from 'p-map';

import { MAX_CONCURRENT_INDEX_ALIAS_OPERATIONS } from '../../../../constants';

export async function deleteIndexAliases(
  esClient: ElasticsearchClient,
  idsToDelete: string[],
  options: { indicesToDelete?: Record<string, string[]> } = {}
) {
  await pMap(
    idsToDelete,
    async (id) => {
      const aliases = await esClient.indices.getAlias({ name: id }, { ignore: [404] });
      const indices = Object.keys(aliases);
      if (!indices.length) return;

      const safeIndices = options.indicesToDelete?.[id]
        ? indices.filter((index) => options.indicesToDelete![id].includes(index))
        : indices;

      if (!safeIndices.length) return;

      return esClient.indices.deleteAlias({ name: id, index: safeIndices }, { ignore: [404] });
    },
    {
      concurrency: MAX_CONCURRENT_INDEX_ALIAS_OPERATIONS,
    }
  );
}
