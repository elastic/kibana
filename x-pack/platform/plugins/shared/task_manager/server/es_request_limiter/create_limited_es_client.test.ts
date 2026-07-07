/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { EsRequestLimitsConfig } from '../config';
import { EsRequestLimiter } from './es_request_limiter';
import { EsRequestLimitReachedError } from './errors';
import { EsRequestCategory } from './es_request_categories';
import { buildTaskEsClient, createLimitedEsClient } from './create_limited_es_client';

const createLimiter = (config: EsRequestLimitsConfig) =>
  new EsRequestLimiter({ config, logger: loggingSystemMock.createLogger() });

describe('createLimitedEsClient', () => {
  it('meters a search request through the limiter and releases afterwards', async () => {
    const limiter = createLimiter({ enabled: true, search: { cluster_wide: 5 } });
    const tryAcquire = jest.spyOn(limiter, 'tryAcquire');
    const release = jest.spyOn(limiter, 'release');
    const client = elasticsearchServiceMock.createElasticsearchClient();

    const wrapped = createLimitedEsClient({
      client,
      limiter,
      taskType: 'my-task',
      esRequestLimits: { search: 3 },
    });

    await wrapped.search({ index: 'foo' });

    expect(client.search).toHaveBeenCalledWith({ index: 'foo' });
    expect(tryAcquire).toHaveBeenCalledWith(EsRequestCategory.Search, {
      taskType: 'my-task',
      scope: 'my-task',
      scopeLimit: 3,
    });
    expect(release).toHaveBeenCalledWith(EsRequestCategory.Search, {
      taskType: 'my-task',
      scope: 'my-task',
      scopeLimit: 3,
    });
  });

  it('uses the declared scope so multiple task types can share a budget', async () => {
    const limiter = createLimiter({ enabled: true, search: { cluster_wide: 5 } });
    const tryAcquire = jest.spyOn(limiter, 'tryAcquire');
    const client = elasticsearchServiceMock.createElasticsearchClient();

    const wrapped = createLimitedEsClient({
      client,
      limiter,
      taskType: 'my-task',
      esRequestLimits: { scope: 'shared-workload', search: 2 },
    });

    await wrapped.search({ index: 'foo' });

    expect(tryAcquire).toHaveBeenCalledWith(EsRequestCategory.Search, {
      taskType: 'my-task',
      scope: 'shared-workload',
      scopeLimit: 2,
    });
  });

  it('categorizes write methods separately', async () => {
    const limiter = createLimiter({ enabled: true, write: { cluster_wide: 5 } });
    const tryAcquire = jest.spyOn(limiter, 'tryAcquire');
    const client = elasticsearchServiceMock.createElasticsearchClient();

    const wrapped = createLimitedEsClient({ client, limiter, taskType: 'my-task' });
    await wrapped.bulk({ operations: [] });

    expect(tryAcquire).toHaveBeenCalledWith(EsRequestCategory.Write, {
      taskType: 'my-task',
      scope: 'my-task',
      scopeLimit: undefined,
    });
  });

  it('throws a 429-shaped error and skips the request when the budget is exhausted', async () => {
    const limiter = createLimiter({ enabled: true, search: { cluster_wide: 5 } });
    jest.spyOn(limiter, 'tryAcquire').mockReturnValue(false);
    const release = jest.spyOn(limiter, 'release');
    const client = elasticsearchServiceMock.createElasticsearchClient();

    const wrapped = createLimitedEsClient({ client, limiter, taskType: 'my-task' });

    await expect(wrapped.search({ index: 'foo' })).rejects.toBeInstanceOf(
      EsRequestLimitReachedError
    );
    await expect(wrapped.search({ index: 'foo' })).rejects.toMatchObject({ statusCode: 429 });
    expect(client.search).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });

  it('releases even when the underlying request throws', async () => {
    const limiter = createLimiter({ enabled: true, search: { cluster_wide: 5 } });
    const release = jest.spyOn(limiter, 'release');
    const client = elasticsearchServiceMock.createElasticsearchClient();
    client.search.mockRejectedValueOnce(new Error('boom'));

    const wrapped = createLimitedEsClient({ client, limiter, taskType: 'my-task' });

    await expect(wrapped.search({ index: 'foo' })).rejects.toThrow('boom');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('passes non-metered methods through without touching the limiter', async () => {
    const limiter = createLimiter({ enabled: true, search: { cluster_wide: 5 } });
    const tryAcquire = jest.spyOn(limiter, 'tryAcquire');
    const client = elasticsearchServiceMock.createElasticsearchClient();

    const wrapped = createLimitedEsClient({ client, limiter, taskType: 'my-task' });
    await wrapped.ping();

    expect(client.ping).toHaveBeenCalled();
    expect(tryAcquire).not.toHaveBeenCalled();
  });
});

describe('buildTaskEsClient', () => {
  it('wraps asInternalUser and asCurrentUser when an API key request is present', async () => {
    const limiter = createLimiter({ enabled: true, search: { cluster_wide: 5 } });
    const tryAcquire = jest.spyOn(limiter, 'tryAcquire');
    const clusterClient = elasticsearchServiceMock.createClusterClient();
    const fakeRequest = httpServerMock.createKibanaRequest();

    const esClient = buildTaskEsClient({
      clusterClient,
      fakeRequest,
      limiter,
      taskType: 'my-task',
    });

    await esClient.asInternalUser.search({ index: 'foo' });
    await esClient.asCurrentUser.search({ index: 'bar' });

    expect(clusterClient.asScoped).toHaveBeenCalledWith(fakeRequest);
    expect(clusterClient.asInternalUser.search).toHaveBeenCalledWith({ index: 'foo' });
    expect(tryAcquire).toHaveBeenCalledTimes(2);
  });

  it('makes asInternalUser available but throws on asCurrentUser use when there is no API key', async () => {
    const limiter = createLimiter({ enabled: true, search: { cluster_wide: 5 } });
    const clusterClient = elasticsearchServiceMock.createClusterClient();

    const esClient = buildTaskEsClient({
      clusterClient,
      fakeRequest: undefined,
      limiter,
      taskType: 'my-task',
    });

    await expect(esClient.asInternalUser.search({ index: 'foo' })).resolves.not.toThrow();
    expect(clusterClient.asScoped).not.toHaveBeenCalled();
    expect(() => esClient.asCurrentUser.search).toThrow(/scheduled without an API key/);
    expect(() => esClient.asSecondaryAuthUser.search).toThrow(/scheduled without an API key/);
  });
});
