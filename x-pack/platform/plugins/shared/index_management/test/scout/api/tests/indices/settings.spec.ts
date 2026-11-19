/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, forDeployment, testData } from '../../fixtures';

const { API_BASE_PATH, COMMON_HEADERS } = testData;

const INDEX_NAME = 'index-management-api-settings';

// Serverless exposes a subset, kept as its own list so it cannot silently shrink.
const EXPECTED_DEFAULTS = [
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
];

const EXPECTED_DEFAULTS_SERVERLESS = [
  'lifecycle',
  'merge',
  'mapping',
  'query',
  'sort',
  'codec',
  'default_pipeline',
  'refresh_interval',
  'blocks',
  'query_string',
];

apiTest.describe('Index settings API', { tag: tags.deploymentAgnostic }, () => {
  let credentials: RoleApiCredentials;
  let expectedDefaults: string[];
  // Serverless reports no index-level settings for a fresh index.
  let expectedProvidedName: string | undefined;
  // Serverless manages replicas itself, so it edits another setting.
  let editableSetting: [name: string, value: string];

  apiTest.beforeAll(async ({ requestAuth, config }) => {
    credentials = await requestAuth.getApiKey('admin');
    expectedDefaults = forDeployment(config, {
      stateful: EXPECTED_DEFAULTS,
      serverless: EXPECTED_DEFAULTS_SERVERLESS,
    });
    expectedProvidedName = forDeployment<string | undefined>(config, {
      stateful: INDEX_NAME,
      serverless: undefined,
    });
    editableSetting = forDeployment(config, {
      stateful: ['number_of_replicas', '2'],
      serverless: ['refresh_interval', '7s'],
    });
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
    await esClient.indices.create({ index: INDEX_NAME });
  });

  apiTest.afterEach(async ({ esClient }) => {
    await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
  });

  apiTest('fetches an index settings', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/settings/${INDEX_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.settings.index?.provided_name).toBe(expectedProvidedName);

    const missing = expectedDefaults.filter(
      (setting) => !Object.hasOwn(response.body.defaults.index, setting)
    );
    expect(missing).toStrictEqual([]);
  });

  apiTest('updates an index settings', async ({ apiClient }) => {
    const [setting, value] = editableSetting;

    const updateResponse = await apiClient.put(`${API_BASE_PATH}/settings/${INDEX_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({ index: { [setting]: value } }),
    });
    expect(updateResponse).toHaveStatusCode(200);

    const response = await apiClient.get(`${API_BASE_PATH}/settings/${INDEX_NAME}`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.settings.index[setting]).toBe(value);
  });
});
