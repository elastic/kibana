/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout/src/types/services';

/**
 * Sets up an enrich index with an enrich policy with sample data for tests.
 * @param esClient The Elasticsearch client.
 */
export const setupEnrichIndexWithPolicy = async (
  esClient: EsClient,
  indexName: string,
  policyName: string
) => {
  await esClient.indices.create({
    index: indexName,
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
      { index: { _index: indexName } },
      { ip: '10.0.0.1', city: 'New York', country: 'US' },
      { index: { _index: indexName } },
      { ip: '10.0.0.2', city: 'London', country: 'GB' },
    ],
  });

  await esClient.enrich.putPolicy({
    name: policyName,
    match: {
      indices: indexName,
      match_field: 'ip',
      enrich_fields: ['city', 'country'],
    },
  });

  await esClient.enrich.executePolicy({ name: policyName });
};

/**
 * Tears down an enrich index with an enrich policy that were created by the setup function.
 * @param esClient The Elasticsearch client.
 */
export const teardownEnrichIndexWithPolicy = async (
  esClient: EsClient,
  indexName: string,
  policyName: string
) => {
  await esClient.enrich.deletePolicy({ name: policyName });
  await esClient.indices.delete({
    index: indexName,
    ignore_unavailable: true,
  });
};
