/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { AI_INDEX_COLLECTION_PATH, AI_INDEX_INTERNAL_PATH, API_HEADERS, INTERNAL_API_HEADERS } =
  testData;
// Unique per run so a retried `beforeAll` does not 409 on fixed names.
const RUN_ID = randomUUID().slice(0, 8);
const AI_INDEX_ID = `scout_search_ai_index_${RUN_ID}`;
const DEST = `ai-index-idx-scout-search-${RUN_ID}`;

const MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' },
    id: { type: 'keyword' },
    type: { type: 'keyword' },
    title: { type: 'text' },
    description: { type: 'text' },
  },
} as const;

const ki = (id: string, timestamp: string, extra: Record<string, unknown> = {}) => ({
  '@timestamp': timestamp,
  id,
  type: 'document',
  ...extra,
});

const kisPath = (query: string) =>
  `${AI_INDEX_INTERNAL_PATH}/${AI_INDEX_ID}/kis?query=${encodeURIComponent(query)}`;

apiTest.describe('context engine KI search', { tag: tags.stateful.classic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let adminHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, samlAuth, esClient, apiClient }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...INTERNAL_API_HEADERS, ...cookieHeader };

    await esClient.indices.create({ index: DEST, mappings: MAPPINGS });

    const response = await apiClient.post(AI_INDEX_COLLECTION_PATH, {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: {
        id: AI_INDEX_ID,
        dest: { type: 'index', value: DEST },
        automations: [],
        sources: [],
      },
    });
    expect(response).toHaveStatusCode(201);

    const { errors } = await esClient.bulk({
      refresh: 'wait_for',
      operations: [
        { index: { _index: DEST, _id: 'title-match' } },
        ki('title-match', '2026-09-01T00:00:00Z', {
          title: 'Refund policy overview',
          description: 'How approvals work',
        }),
        { index: { _index: DEST, _id: 'desc-match' } },
        ki('desc-match', '2026-09-01T00:00:00Z', {
          title: 'Customer handbook',
          description: 'Section on refund requests',
        }),
        { index: { _index: DEST, _id: 'no-match' } },
        ki('no-match', '2026-09-01T00:00:00Z', {
          title: 'Shipping timelines',
          description: 'Delivery windows',
        }),
        // Obsolete revision matches "refund" but is superseded by a newer revision that
        // doesn't; the latest-revision collapse must drop it before MATCH ever sees it.
        { index: { _index: DEST, _id: 'revised-old' } },
        ki('revised-match', '2026-09-01T00:00:00Z', { title: 'Refund policy draft' }),
        { index: { _index: DEST, _id: 'revised-new' } },
        ki('revised-match', '2026-09-02T00:00:00Z', { title: 'Finalized escalation steps' }),
      ],
    });
    expect(errors).toBe(false);
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    await apiClient.delete(`${AI_INDEX_COLLECTION_PATH}/${AI_INDEX_ID}`, {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
    });
    await esClient.indices.delete({ index: DEST }, { ignore: [404] });
  });

  apiTest(
    'matches title and description, ranks the title match first, and excludes a superseded revision',
    async ({ apiClient }) => {
      const response = await apiClient.get(kisPath('refund'), {
        headers: adminHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.kis.map((item: { id: string }) => item.id)).toStrictEqual([
        'title-match',
        'desc-match',
      ]);
      expect(response.body.total).toBe(2);
    }
  );

  apiTest('returns no results for a non-matching query', async ({ apiClient }) => {
    const response = await apiClient.get(kisPath('nonexistentterm'), {
      headers: adminHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.kis).toStrictEqual([]);
    expect(response.body.total).toBe(0);
  });
});
