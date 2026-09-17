/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { CreateSourceRequest, SourceWithHealth } from '@kbn/nightshift-shared';
import type { ApiClientFixture, ApiClientResponse, EsClient } from '@kbn/scout';
import { COMMON_HEADERS, SOURCES_PATH, TEST_INDEX_PREFIX } from './constants';

type CookieHeader = Record<string, string>;

/** A per-run suffix so repeated runs against a shared deployment cannot collide. */
export const uniqueSuffix = (): string => randomUUID().slice(0, 8);

export const testIndexName = (suffix: string): string => `${TEST_INDEX_PREFIX}${suffix}`;

const withHeaders = (cookieHeader: CookieHeader) => ({
  headers: { ...COMMON_HEADERS, ...cookieHeader },
  responseType: 'json' as const,
});

export const createSource = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  body: CreateSourceRequest
): Promise<ApiClientResponse> =>
  apiClient.post(SOURCES_PATH, { ...withHeaders(cookieHeader), body });

export const getSource = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  id: string
): Promise<ApiClientResponse> => apiClient.get(`${SOURCES_PATH}/${id}`, withHeaders(cookieHeader));

export const listSources = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  query = ''
): Promise<ApiClientResponse> =>
  apiClient.get(query ? `${SOURCES_PATH}?${query}` : SOURCES_PATH, withHeaders(cookieHeader));

export const updateSource = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  id: string,
  body: CreateSourceRequest
): Promise<ApiClientResponse> =>
  apiClient.put(`${SOURCES_PATH}/${id}`, { ...withHeaders(cookieHeader), body });

export const deleteSource = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  id: string
): Promise<ApiClientResponse> =>
  apiClient.delete(`${SOURCES_PATH}/${id}`, withHeaders(cookieHeader));

export const setSourceEnabled = (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  id: string,
  enabled: boolean
): Promise<ApiClientResponse> =>
  apiClient.post(`${SOURCES_PATH}/${id}/${enabled ? '_enable' : '_disable'}`, {
    ...withHeaders(cookieHeader),
    body: {},
  });

interface ListBody {
  sources: SourceWithHealth[];
}

export const findListed = (body: ListBody, id: string): SourceWithHealth | undefined =>
  body.sources.find((entry) => entry.source.id === id);

export const listedIds = (body: ListBody): string[] => body.sources.map((entry) => entry.source.id);

export const createTestIndex = async (esClient: EsClient, index: string): Promise<void> => {
  await esClient.indices.delete({ index }, { ignore: [404] });
  await esClient.indices.create({
    index,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        status: { type: 'integer' },
        host: { properties: { name: { type: 'keyword' } } },
      },
    },
  });
  await esClient.index({
    index,
    refresh: 'wait_for',
    document: { '@timestamp': new Date().toISOString(), status: 500, host: { name: 'web-1' } },
  });
};

export const deleteTestIndex = (esClient: EsClient, index: string): Promise<unknown> =>
  esClient.indices.delete({ index }, { ignore: [404] });

export const readView = async (
  esClient: EsClient,
  name: string
): Promise<{ name: string; query: string } | undefined> => {
  const body = (await esClient.esql.getView({ name }, { ignore: [404] })) as {
    views?: Array<{ name: string; query: string }>;
  };
  return Array.isArray(body.views) ? body.views[0] : undefined;
};

export const cleanupSources = async (
  apiClient: ApiClientFixture,
  cookieHeader: CookieHeader,
  titlePrefix: string
): Promise<void> => {
  const response = await listSources(apiClient, cookieHeader, 'per_page=100');
  if (response.statusCode !== 200) {
    throw new Error(`Failed to list sources for cleanup: ${JSON.stringify(response.body)}`);
  }
  for (const { source } of (response.body as ListBody).sources) {
    if (source.title.startsWith(titlePrefix)) {
      await deleteSource(apiClient, cookieHeader, source.id);
    }
  }
};
