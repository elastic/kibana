/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_ASYNC_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { wrapAsyncSearchClient } from './wrap_async_search_client';
import type { KibanaRequest } from '@kbn/core-http-server';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
} as unknown as KibanaRequest;

let logger: ReturnType<typeof loggingSystemMock.createLogger>;

describe('wrapScopedClusterClient', () => {
  const client = dataPluginMock.createStartContract().search.asScoped(fakeRequest);

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test('searches with the correct params', async () => {
    const abortController = new AbortController();
    client.search = jest.fn().mockImplementation(
      (): Observable<IKibanaSearchResponse<ESQLSearchResponse>> =>
        of({
          isRunning: false,
          rawResponse: { took: 1, columns: [], values: [] },
        })
    );

    const asyncSearchClient = wrapAsyncSearchClient({
      strategy: ESQL_ASYNC_SEARCH_STRATEGY,
      client,
      abortController,
      rule: {
        name: 'test-rule',
        alertTypeId: 'test-type',
        id: 'foo',
        spaceId: 'default',
      },
      logger,
    });

    await asyncSearchClient.search({
      request: {
        params: { query: '', filter: '', keep_alive: '10m' },
      },
      options: { retrieveResults: true },
    });

    expect(client.search).toHaveBeenCalledWith(
      { params: { query: '', filter: '', keep_alive: '10m' } },
      {
        abortSignal: abortController.signal,
        strategy: ESQL_ASYNC_SEARCH_STRATEGY,
        retrieveResults: true,
      }
    );
  });

  test('returns the rawResponse', async () => {
    const abortController = new AbortController();
    client.search = jest.fn().mockImplementation(
      (): Observable<IKibanaSearchResponse<ESQLSearchResponse>> =>
        of({
          isRunning: false,
          rawResponse: { took: 1, columns: [], values: [] },
        })
    );

    const asyncSearchClient = wrapAsyncSearchClient({
      strategy: ESQL_ASYNC_SEARCH_STRATEGY,
      client,
      abortController,
      rule: {
        name: 'test-rule',
        alertTypeId: 'test-type',
        id: 'foo',
        spaceId: 'default',
      },
      logger,
    });

    const response = await asyncSearchClient.search({
      request: {
        params: { query: '', filter: '', keep_alive: '10m', wait_for_completion_timeout: '10m' },
      },
      options: { retrieveResults: true },
    });

    expect(response).toEqual({ took: 1, columns: [], values: [] });
  });

  test('re-throws error when search throws error', async () => {
    const abortController = new AbortController();
    client.search = jest.fn().mockReturnValue(throwError(() => new Error('something went wrong!')));

    const asyncSearchClient = wrapAsyncSearchClient({
      strategy: ESQL_ASYNC_SEARCH_STRATEGY,
      client,
      abortController,
      rule: {
        name: 'test-rule',
        alertTypeId: 'test-type',
        id: 'foo',
        spaceId: 'default',
      },
      logger,
    });

    await expect(
      asyncSearchClient.search({ request: { params: { query: '' } } })
    ).rejects.toThrowErrorMatchingInlineSnapshot('"something went wrong!"');
  });

  test('throws error when search throws abort error', async () => {
    const abortController = new AbortController();
    abortController.abort();
    client.search = jest.fn().mockReturnValue(throwError(() => new Error()));

    const asyncSearchClient = wrapAsyncSearchClient({
      strategy: ESQL_ASYNC_SEARCH_STRATEGY,
      client,
      abortController,
      rule: {
        name: 'test-rule',
        alertTypeId: 'test-type',
        id: 'foo',
        spaceId: 'default',
      },
      logger,
    });

    await expect(
      asyncSearchClient.search({ request: { params: { query: '' } } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Search has been aborted due to cancelled execution"'
    );
  });

  test('keeps the metrics', async () => {
    const abortController = new AbortController();
    client.search = jest.fn().mockImplementation(
      (): Observable<IKibanaSearchResponse<ESQLSearchResponse>> =>
        of(
          {
            isRunning: true,
            rawResponse: { took: 1, columns: [], values: [] },
          },
          {
            isRunning: false,
            rawResponse: { took: 100, columns: [], values: [] },
          }
        )
    );

    const asyncSearchClient = wrapAsyncSearchClient({
      strategy: ESQL_ASYNC_SEARCH_STRATEGY,
      client,
      abortController,
      rule: {
        name: 'test-rule',
        alertTypeId: 'test-type',
        id: 'foo',
        spaceId: 'default',
      },
      logger,
    });

    await asyncSearchClient.search({ request: { params: { query: '' } } });
    await asyncSearchClient.search({ request: { params: { query: '' } } });

    expect(asyncSearchClient.getMetrics()).toEqual({
      numSearches: 2,
      esSearchDurationMs: 200, // 100x2
      totalSearchDurationMs: expect.any(Number),
    });
  });
});
