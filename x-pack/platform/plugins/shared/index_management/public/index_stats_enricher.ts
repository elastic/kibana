/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Enricher, EnricherResponse } from '@kbn/index-management-shared-types';
import type { EsClientPluginSetup } from '@kbn/es-client-plugin/public';
import { i18n } from '@kbn/i18n';
const SOURCE = i18n.translate('xpack.idxMgmt.indexStatsEnricher.source', {
  defaultMessage: 'index stats',
});

export const createIndexStatsEnricher = (esClient: EsClientPluginSetup): Enricher => ({
  name: SOURCE,
  fn: async (_client, signal): Promise<EnricherResponse> => {
    const client = await esClient.getClient();
    const response = await client.indices.stats(
      {
        index: '*',
        expand_wildcards: ['hidden', 'all'],
        forbid_closed_indices: false,
        metric: ['docs', 'store'],
        filter_path: [
          '*.*.uuid',
          '*.*.status',
          '*.*.health',
          '*.*.primaries.docs.count',
          '*.*.primaries.docs.deleted',
          '*.*.total.store.size_in_bytes',
          '*.*.primaries.store.size_in_bytes',
        ],
      },
      { signal }
    );
    const indices = response.indices || {};
    return {
      indices: Object.keys(indices).map((name) => ({
        name,
        health: indices[name]?.health,
        status: indices[name]?.status,
        uuid: indices[name]?.uuid,
        documents: indices[name]?.primaries?.docs?.count ?? 0,
        documents_deleted: indices[name]?.primaries?.docs?.deleted ?? 0,
        primary_size: indices[name]?.primaries?.store?.size_in_bytes ?? 0,
        size: indices[name]?.total?.store?.size_in_bytes ?? 0,
      })),
      source: SOURCE,
    };
  },
});
