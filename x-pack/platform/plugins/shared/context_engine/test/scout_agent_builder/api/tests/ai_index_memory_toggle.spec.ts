/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { AI_INDEX_COLLECTION_PATH: COLLECTION, API_HEADERS } = testData;
const aiIndexPath = (id: string) => `${COLLECTION}/${id}`;
const dataStreamDest = (value: string) => ({ type: 'data_stream', value });

apiTest.describe('AI-index memory toggle', { tag: tags.stateful.classic }, () => {
  apiTest('round-trips the toggle', async ({ apiClient, esClient, requestAuth }) => {
    const id = 'scout_memory_toggle_ai_index';
    const path = aiIndexPath(id);
    const dest = 'ai-index-ds-scout-memory-toggle';
    const credentials = await requestAuth.getApiKey('admin');
    const headers = { ...credentials.apiKeyHeader, ...API_HEADERS };
    const body = {
      description: 'Memory toggle integration test',
      dest: dataStreamDest(dest),
      automations: [],
      sources: [],
    };

    await apiClient.delete(path, { headers, responseType: 'json' });
    await esClient.indices.createDataStream({ name: dest }, { ignore: [400] });

    try {
      const createResponse = await apiClient.post(COLLECTION, {
        headers,
        responseType: 'json',
        body: { id, ...body },
      });
      expect(createResponse).toHaveStatusCode(201);

      const defaultResponse = await apiClient.get(path, {
        headers,
        responseType: 'json',
      });
      expect(defaultResponse).toHaveStatusCode(200);
      expect(defaultResponse.body.memory_enabled).toBe(true);

      const updateResponse = await apiClient.put(path, {
        headers,
        responseType: 'json',
        body: { ...body, memory_enabled: false },
      });
      expect(updateResponse).toHaveStatusCode(200);

      const disabledResponse = await apiClient.get(path, {
        headers,
        responseType: 'json',
      });
      expect(disabledResponse).toHaveStatusCode(200);
      expect(disabledResponse.body.memory_enabled).toBe(false);
    } finally {
      await apiClient.delete(path, { headers, responseType: 'json' });
      await esClient.indices.deleteDataStream({ name: dest }, { ignore: [404] });
    }
  });
});
