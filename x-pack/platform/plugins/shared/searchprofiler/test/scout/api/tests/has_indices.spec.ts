/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { COMMON_HEADERS, SEARCH_PROFILER_API_TAGS } from '../fixtures/constants';

const INDEX_NAME = 'search_profiler_scout_has_indices_index';
const ALIAS_NAME = 'search_profiler_scout_has_indices_alias';
const DATA_STREAM_NAME = 'search-profiler-scout-has-indices-stream';
const TEMPLATE_NAME = 'search-profiler-scout-has-indices-template';

apiTest.describe(
  'GET api/searchprofiler/has_indices',
  {
    tag: SEARCH_PROFILER_API_TAGS,
  },
  () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ esClient, requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
      // The route reports whether any index exists in the cluster; create one so
      // the expectation doesn't depend on indices leaked by unrelated suites.
      await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
      await esClient.indices.create({ index: INDEX_NAME, aliases: { [ALIAS_NAME]: {} } });
      await esClient.indices.putIndexTemplate({
        name: TEMPLATE_NAME,
        index_patterns: [DATA_STREAM_NAME],
        data_stream: {},
        template: {
          mappings: { properties: { '@timestamp': { type: 'date' } } },
        },
      });
      await esClient.indices.createDataStream({ name: DATA_STREAM_NAME });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.deleteDataStream({ name: DATA_STREAM_NAME }, { ignore: [404] });
      await esClient.indices.deleteIndexTemplate({ name: TEMPLATE_NAME }, { ignore: [404] });
      await esClient.indices.delete({ index: INDEX_NAME }, { ignore: [404] });
    });

    apiTest('reports that the cluster has indices', async ({ apiClient }) => {
      const response = await apiClient.get('api/searchprofiler/has_indices', {
        headers: {
          ...COMMON_HEADERS,
          ...adminApiCredentials.apiKeyHeader,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        hasIndices: true,
        indices: expect.arrayContaining([INDEX_NAME, ALIAS_NAME, DATA_STREAM_NAME]),
      });
    });
  }
);
