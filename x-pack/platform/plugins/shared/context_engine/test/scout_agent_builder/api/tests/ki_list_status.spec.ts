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
import { apiTest, registerAiIndex, testData, withQuery } from '../fixtures';

const { AI_INDEX_COLLECTION_PATH, API_HEADERS, INTERNAL_API_HEADERS, kiListPath } = testData;
// Unique per run so a retried `beforeAll` does not 409 on fixed names.
const RUN_ID = randomUUID().slice(0, 8);
const AI_INDEX_ID = `scout_ki_list_status_${RUN_ID}`;
const DEST = `ai-index-idx-scout-ki-list-status-${RUN_ID}`;

const PAST = '2000-01-01T00:00:00Z';
const FUTURE = '2100-01-01T00:00:00Z';

const MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' },
    id: { type: 'keyword' },
    type: { type: 'keyword' },
    title: { type: 'keyword' },
    expires_at: { type: 'date' },
    governance: {
      properties: {
        lifecycle: { properties: { status: { type: 'keyword' } } },
      },
    },
  },
} as const;

const ki = (
  id: string,
  { status, expiresAt }: { status?: 'deleted' | 'verification_failed'; expiresAt?: string } = {}
) => ({
  '@timestamp': '2026-09-01T00:00:00Z',
  id,
  type: 'document',
  title: id,
  ...(expiresAt ? { expires_at: expiresAt } : {}),
  ...(status ? { governance: { lifecycle: { status } } } : {}),
});

interface ListedKi {
  id: string;
  lifecycle_status: string;
  status: string;
}

const byId = (kis: ListedKi[]) =>
  Object.fromEntries(
    kis.map(({ id, lifecycle_status: lifecycleStatus, status }) => [
      id,
      { lifecycle_status: lifecycleStatus, status },
    ])
  );

apiTest.describe('context engine KI list status', { tag: tags.stateful.classic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let adminInternalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, esClient, apiClient }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    adminInternalHeaders = { ...INTERNAL_API_HEADERS, ...adminApiCredentials.apiKeyHeader };

    await esClient.indices.create({ index: DEST, mappings: MAPPINGS });

    const response = await apiClient.post(AI_INDEX_COLLECTION_PATH, {
      headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
      responseType: 'json',
      body: registerAiIndex(AI_INDEX_ID, { type: 'index', value: DEST }),
    });
    expect(response).toHaveStatusCode(201);

    const { errors } = await esClient.bulk({
      refresh: 'wait_for',
      operations: [
        { index: { _index: DEST, _id: 'active' } },
        ki('active'),
        { index: { _index: DEST, _id: 'unexpired' } },
        ki('unexpired', { expiresAt: FUTURE }),
        { index: { _index: DEST, _id: 'expired' } },
        ki('expired', { expiresAt: PAST }),
        { index: { _index: DEST, _id: 'deleted-past-expiry' } },
        ki('deleted-past-expiry', { status: 'deleted', expiresAt: PAST }),
        { index: { _index: DEST, _id: 'failed-past-expiry' } },
        ki('failed-past-expiry', { status: 'verification_failed', expiresAt: PAST }),
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
    'returns the stored and the computed status, excluding deleted KIs by default',
    async ({ apiClient }) => {
      const response = await apiClient.get(kiListPath(AI_INDEX_ID), {
        headers: adminInternalHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(byId(response.body.kis)).toStrictEqual({
        active: { lifecycle_status: 'active', status: 'active' },
        unexpired: { lifecycle_status: 'active', status: 'active' },
        expired: { lifecycle_status: 'active', status: 'expired' },
        'failed-past-expiry': {
          lifecycle_status: 'verification_failed',
          status: 'verification_failed',
        },
      });
      expect(response.body.total).toBe(4);
    }
  );

  apiTest('lists only active KIs past expires_at for status=expired', async ({ apiClient }) => {
    const response = await apiClient.get(
      withQuery(kiListPath(AI_INDEX_ID), { status: 'expired' }),
      { headers: adminInternalHeaders, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
    expect(byId(response.body.kis)).toStrictEqual({
      expired: { lifecycle_status: 'active', status: 'expired' },
    });
    expect(response.body.total).toBe(1);
  });

  apiTest('excludes expired KIs for status=active', async ({ apiClient }) => {
    const response = await apiClient.get(withQuery(kiListPath(AI_INDEX_ID), { status: 'active' }), {
      headers: adminInternalHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.kis.map(({ id }: ListedKi) => id)).toStrictEqual(['active', 'unexpired']);
    expect(response.body.total).toBe(2);
  });

  apiTest(
    'keeps the stored status of deleted and failed KIs past expires_at',
    async ({ apiClient }) => {
      const deleted = await apiClient.get(
        withQuery(kiListPath(AI_INDEX_ID), { status: 'deleted' }),
        { headers: adminInternalHeaders, responseType: 'json' }
      );
      expect(deleted).toHaveStatusCode(200);
      expect(byId(deleted.body.kis)).toStrictEqual({
        'deleted-past-expiry': { lifecycle_status: 'deleted', status: 'deleted' },
      });

      const failed = await apiClient.get(
        withQuery(kiListPath(AI_INDEX_ID), { status: 'verification_failed' }),
        { headers: adminInternalHeaders, responseType: 'json' }
      );
      expect(failed).toHaveStatusCode(200);
      expect(byId(failed.body.kis)).toStrictEqual({
        'failed-past-expiry': {
          lifecycle_status: 'verification_failed',
          status: 'verification_failed',
        },
      });
    }
  );

  apiTest('combines several statuses in one filter', async ({ apiClient }) => {
    const response = await apiClient.get(
      `${kiListPath(AI_INDEX_ID)}?status=active&status=expired`,
      { headers: adminInternalHeaders, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.kis.map(({ id }: ListedKi) => id)).toStrictEqual([
      'active',
      'expired',
      'unexpired',
    ]);
    expect(response.body.total).toBe(3);
  });
});
