/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  apiTest,
  createHeaders,
  createIndex,
  deleteIndices,
  indexManagementApi,
  uniqueName,
} from '../fixtures';

const expectedSettings = [
  'max_inner_result_window',
  'unassigned',
  'max_terms_count',
  'lifecycle',
  'routing_partition_size',
  'max_docvalue_fields_search',
  'merge',
  'max_refresh_listeners',
  'max_regex_length',
  'load_fixed_bitset_filters_eagerly',
  'number_of_routing_shards',
  'write',
  'verified_before_close',
  'mapping',
  'source_only',
  'soft_deletes',
  'max_script_fields',
  'query',
  'format',
  'sort',
  'priority',
  'codec',
  'max_rescore_window',
  'analyze',
  'gc_deletes',
  'max_ngram_diff',
  'translog',
  'auto_expand_replicas',
  'requests',
  'data_path',
  'highlight',
  'routing',
  'search',
  'fielddata',
  'default_pipeline',
  'max_slices_per_scroll',
  'shard',
  'xpack',
  'percolator',
  'allocation',
  'refresh_interval',
  'indexing',
  'compound_format',
  'blocks',
  'max_result_window',
  'store',
  'queries',
  'warmer',
  'max_shingle_diff',
  'query_string',
] as const;

apiTest.describe('Index Management settings API', { tag: tags.stateful.classic }, () => {
  const indices: string[] = [];

  apiTest.afterAll(async ({ esClient, log }) => {
    await deleteIndices(esClient, indices, log);
  });

  apiTest('fetches index settings', async ({ apiClient, esClient, requestAuth }) => {
    const index = await createIndex({ esClient, index: uniqueName('im-settings') });
    indices.push(index);

    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const response = await indexManagementApi(apiClient, createHeaders(apiKeyHeader)).settings.get(
      index
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.settings.index.provided_name).toBe(index);

    for (const setting of expectedSettings) {
      expect(
        Object.hasOwn(response.body.defaults.index, setting),
        `Expected setting "${setting}"`
      ).toBe(true);
    }
  });

  apiTest('updates index settings', async ({ apiClient, esClient, requestAuth }) => {
    const index = await createIndex({ esClient, index: uniqueName('im-settings-update') });
    indices.push(index);

    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const api = indexManagementApi(apiClient, createHeaders(apiKeyHeader));

    const initialResponse = await api.settings.get(index);
    expect(initialResponse.body.settings.index.number_of_replicas).toBe('1');

    const updateResponse = await api.settings.update(index, {
      index: {
        number_of_replicas: 2,
      },
    });
    expect(updateResponse).toHaveStatusCode(200);

    const updatedResponse = await api.settings.get(index);
    expect(updatedResponse.body.settings.index.number_of_replicas).toBe('2');
  });
});
