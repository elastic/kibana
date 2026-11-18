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
import { apiTest, registerAiIndex, testData } from '../fixtures';

const { AI_INDEX_COLLECTION_PATH, API_HEADERS, INTERNAL_API_HEADERS, kiListPath } = testData;
// Unique per run so a retried `beforeAll` does not 409 on fixed names.
const RUN_ID = randomUUID().slice(0, 8);
const AI_INDEX_ID = `scout_ki_groups_${RUN_ID}`;
const DEST = `ai-index-idx-scout-ki-groups-${RUN_ID}`;
const EMPTY_AI_INDEX_ID = `scout_ki_groups_empty_${RUN_ID}`;
const EMPTY_DEST = `ai-index-idx-scout-ki-groups-empty-${RUN_ID}`;

const PAST = '2000-01-01T00:00:00Z';
const LONG_TYPE = 'x'.repeat(300);
const TOP_5 = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];

const MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' },
    id: { type: 'keyword' },
    type: { type: 'keyword' },
    title: { type: 'text' },
    expires_at: { type: 'date' },
  },
} as const;

interface KiDoc {
  id: string;
  type?: string | string[];
  title?: string;
  timestamp?: string;
  expiresAt?: string;
}

const kiDoc = ({ id, type, title, timestamp, expiresAt }: KiDoc) => ({
  '@timestamp': timestamp ?? '2026-09-01T00:00:00Z',
  id,
  title: title ?? `${id} doc`,
  ...(type !== undefined ? { type } : {}),
  ...(expiresAt ? { expires_at: expiresAt } : {}),
});

const typed = (type: string, count: number, extra: Partial<KiDoc> = {}): KiDoc[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${type}-${i + 1}`, type, ...extra }));

// Active: alpha 5 (one multi-value), beta 4, gamma 3, delta 2 (one retyped from epsilon),
// epsilon 2, then zeta 1, no type 1, "" 1, a 300-char type 1. Plus 2 expired KIs.
const KI_DOCS: Array<{ docId: string; doc: KiDoc }> = [
  ...typed('alpha', 3),
  { id: 'alpha-refund', type: 'alpha', title: 'Refund policy' },
  { id: 'multi', type: ['omega', 'alpha'] },
  ...typed('beta', 4),
  ...typed('gamma', 3),
  ...typed('delta', 1),
  { id: 'retyped', type: 'epsilon', title: 'Old revision', timestamp: '2026-08-01T00:00:00Z' },
  ...typed('epsilon', 2),
  { id: 'zeta-refund', type: 'zeta', title: 'Refund steps' },
  { id: 'no-type', title: 'Refund notes' },
  { id: 'empty-type', type: '' },
  { id: 'long-type', type: LONG_TYPE },
  { id: 'alpha-expired', type: 'alpha', expiresAt: PAST },
  { id: 'zeta-expired', type: 'zeta', expiresAt: PAST },
]
  .map((doc) => ({ docId: doc.id, doc }))
  .concat({
    docId: 'retyped-new',
    doc: { id: 'retyped', type: 'delta', title: 'New revision', timestamp: '2026-09-02T00:00:00Z' },
  });

interface GroupsResponse {
  total: number;
  total_other: number;
  groups: Array<{ type: string; count: number; kis: Array<{ id: string; type?: string }> }>;
}

const toQuery = (params: Record<string, string | number | string[]>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value].flat()) {
      search.append(key, String(item));
    }
  }
  return search.toString();
};

const groupsPath = (aiIndexId: string, params: Record<string, string | number | string[]> = {}) =>
  `${kiListPath(aiIndexId)}/_groups?${toQuery(params)}`;
const listPath = (params: Record<string, string | number | string[]>) =>
  `${kiListPath(AI_INDEX_ID)}?${toQuery(params)}`;

const counts = ({ groups }: GroupsResponse) =>
  groups.map(({ type, count }) => `${type}=${count}`).join(',');

apiTest.describe('context engine KI groups', { tag: tags.stateful.classic }, () => {
  let adminApiCredentials: RoleApiCredentials;
  let adminInternalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ requestAuth, esClient, apiClient }) => {
    adminApiCredentials = await requestAuth.getApiKey('admin');
    adminInternalHeaders = { ...INTERNAL_API_HEADERS, ...adminApiCredentials.apiKeyHeader };

    for (const [aiIndexId, dest] of [
      [AI_INDEX_ID, DEST],
      [EMPTY_AI_INDEX_ID, EMPTY_DEST],
    ]) {
      await esClient.indices.create({ index: dest, mappings: MAPPINGS });
      const response = await apiClient.post(AI_INDEX_COLLECTION_PATH, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
        body: registerAiIndex(aiIndexId, { type: 'index', value: dest }),
      });
      expect(response).toHaveStatusCode(201);
    }

    const { errors } = await esClient.bulk({
      refresh: 'wait_for',
      operations: KI_DOCS.flatMap(({ docId, doc }) => [
        { index: { _index: DEST, _id: docId } },
        kiDoc(doc),
      ]),
    });
    expect(errors).toBe(false);
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    for (const [aiIndexId, dest] of [
      [AI_INDEX_ID, DEST],
      [EMPTY_AI_INDEX_ID, EMPTY_DEST],
    ]) {
      await apiClient.delete(`${AI_INDEX_COLLECTION_PATH}/${aiIndexId}`, {
        headers: { ...adminApiCredentials.apiKeyHeader, ...API_HEADERS },
        responseType: 'json',
      });
      await esClient.indices.delete({ index: dest }, { ignore: [404] });
    }
  });

  apiTest(
    'serves /kis/_groups from its own route, not as a KI id, next to the get-one route',
    async ({ apiClient }) => {
      const groups = await apiClient.get(groupsPath(AI_INDEX_ID, { status: 'active' }), {
        headers: adminInternalHeaders,
        responseType: 'json',
      });
      expect(groups).toHaveStatusCode(200);
      expect(Array.isArray(groups.body.groups)).toBe(true);

      const one = await apiClient.get(`${kiListPath(AI_INDEX_ID)}/alpha-1?index=${DEST}`, {
        headers: adminInternalHeaders,
        responseType: 'json',
      });
      expect(one).toHaveStatusCode(200);
      expect(one.body.id).toBe('alpha-1');
    }
  );

  apiTest(
    'returns the 5 biggest types with their first KIs, one type per KI, the rest as other',
    async ({ apiClient }) => {
      const response = await apiClient.get(groupsPath(AI_INDEX_ID, { status: 'active' }), {
        headers: adminInternalHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      const body = response.body as GroupsResponse;
      // The multi-value KI counts once, as its lowest type; the retyped KI only as its latest type.
      expect(counts(body)).toBe('alpha=5,beta=4,gamma=3,delta=2,epsilon=2');
      // zeta, no type, "" and the 300-char type.
      expect(body.total).toBe(20);
      expect(body.total_other).toBe(4);
      for (const { type, count, kis } of body.groups) {
        expect(kis).toHaveLength(Math.min(3, count));
        expect(kis.every((item) => item.type === type)).toBe(true);
      }
      expect(body.groups.find(({ type }) => type === 'delta')?.kis.map(({ id }) => id)).toContain(
        'retyped'
      );
    }
  );

  apiTest('lists what "Other" counts through /kis?exclude_types', async ({ apiClient }) => {
    const response = await apiClient.get(
      listPath({ status: 'active', size: 25, exclude_types: TOP_5 }),
      { headers: adminInternalHeaders, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(4);
    expect(response.body.kis.map(({ id }: { id: string }) => id).sort()).toStrictEqual([
      'empty-type',
      'long-type',
      'no-type',
      'zeta-refund',
    ]);
    const typeById = Object.fromEntries(
      response.body.kis.map(({ id, type }: { id: string; type?: string }) => [id, type])
    );
    expect(typeById['empty-type']).toBeUndefined();
    expect(typeById['no-type']).toBeUndefined();
    expect(typeById['long-type']).toBe(LONG_TYPE);
    // The summary ignores exclude_types and has no "" type.
    expect(response.body.summary.total).toBe(20);
    expect(
      response.body.summary.counts_by_type.map(({ type }: { type: string }) => type)
    ).toStrictEqual(TOP_5);
  });

  for (const [name, params] of [
    ['search', { status: 'active', query: 'refund' }],
    ['status=expired', { status: 'expired' }],
    ['all statuses', {}],
  ] as const) {
    apiTest(`total_other matches the "Other" list total with ${name}`, async ({ apiClient }) => {
      const groups = await apiClient.get(groupsPath(AI_INDEX_ID, { ...params, max_groups: 1 }), {
        headers: adminInternalHeaders,
        responseType: 'json',
      });
      expect(groups).toHaveStatusCode(200);
      const body = groups.body as GroupsResponse;
      expect(body.groups).toHaveLength(1);

      const other = await apiClient.get(
        listPath({ ...params, size: 0, exclude_types: body.groups.map(({ type }) => type) }),
        { headers: adminInternalHeaders, responseType: 'json' }
      );
      expect(other).toHaveStatusCode(200);
      expect(other.body.total).toBe(body.total_other);
      expect(body.total).toBe(body.groups[0].count + body.total_other);
    });
  }

  apiTest('counts only expired KIs for status=expired', async ({ apiClient }) => {
    const response = await apiClient.get(groupsPath(AI_INDEX_ID, { status: 'expired' }), {
      headers: adminInternalHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const body = response.body as GroupsResponse;
    expect(counts(body)).toBe('alpha=1,zeta=1');
    expect(body.total).toBe(2);
    expect(body.total_other).toBe(0);
  });

  apiTest('returns zeros for an AI index without KIs', async ({ apiClient }) => {
    const response = await apiClient.get(groupsPath(EMPTY_AI_INDEX_ID), {
      headers: adminInternalHeaders,
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ total: 0, total_other: 0, groups: [] });
  });

  apiTest('rejects unbounded group params with 400', async ({ apiClient }) => {
    const invalid: Array<Record<string, number>> = [
      { max_groups: 11 },
      { preview_size: 26 },
      { preview_size: 2.5 },
    ];
    for (const params of invalid) {
      const response = await apiClient.get(groupsPath(AI_INDEX_ID, params), {
        headers: adminInternalHeaders,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    }
  });
});
