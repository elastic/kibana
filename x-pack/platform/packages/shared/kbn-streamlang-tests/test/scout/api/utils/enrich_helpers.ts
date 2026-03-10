/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout/src/types/services';

export const ENRICH_SOURCE_INDEX = 'streams-e2e-enrich-source-ip-location';
export const ENRICH_POLICY_NAME = 'streams-e2e-ip-location-policy';

/**
 * Sets up an enrich index with an enrich policy with sample data for tests.
 * @param esClient The Elasticsearch client.
 */
export const setupEnrichIndexWithPolicy = async (esClient: EsClient) => {
  await esClient.indices.create({
    index: ENRICH_SOURCE_INDEX,
    mappings: {
      properties: {
        ip: { type: 'keyword' },
        city: { type: 'keyword' },
        country: { type: 'keyword' },
      },
    },
  });

  await esClient.bulk({
    refresh: true,
    body: [
      { index: { _index: ENRICH_SOURCE_INDEX } },
      { ip: '10.0.0.1', city: 'New York', country: 'US' },
      { index: { _index: ENRICH_SOURCE_INDEX } },
      { ip: '10.0.0.2', city: 'London', country: 'GB' },
    ],
  });

  await esClient.enrich.putPolicy({
    name: ENRICH_POLICY_NAME,
    match: {
      indices: ENRICH_SOURCE_INDEX,
      match_field: 'ip',
      enrich_fields: ['city', 'country'],
    },
  });

  await esClient.enrich.executePolicy({ name: ENRICH_POLICY_NAME });
};

/**
 * Tears down an enrich index with an enrich policy that were created by the setup function.
 * @param esClient The Elasticsearch client.
 */
export const teardownEnrichIndexWithPolicy = async (esClient: EsClient) => {
  await esClient.enrich.deletePolicy({ name: ENRICH_POLICY_NAME });
  await esClient.indices.delete({
    index: ENRICH_SOURCE_INDEX,
    ignore_unavailable: true,
  });
};
