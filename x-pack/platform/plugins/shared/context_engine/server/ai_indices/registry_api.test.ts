/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  deleteAiIndexRecord,
  getAiIndexRecord,
  listAiIndexRecords,
  putAiIndexRecord,
} from './registry_api';

const responseError = (statusCode: number) =>
  new errors.ResponseError({
    meta: {} as never,
    warnings: null,
    body: { error: { type: 'resource_not_found_exception', reason: 'missing' } },
    statusCode,
  });

const record = {
  space: 'default',
  managed: false,
  dest: { type: 'index' as const, value: 'ai-index-idx-support' },
  automations: [],
  sources: [],
  traces: [],
};

describe('registry api', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('PUTs a record, passing create only when asked', async () => {
    esClient.transport.request.mockResolvedValue({ result: 'created', ai_index: {} });

    await putAiIndexRecord(esClient, { id: 'support', record, create: true });
    await putAiIndexRecord(esClient, { id: 'a/b', record });

    expect(esClient.transport.request).toHaveBeenNthCalledWith(1, {
      method: 'PUT',
      path: '/_context_engine/ai_index/support',
      querystring: { create: true },
      body: record,
    });
    expect(esClient.transport.request).toHaveBeenNthCalledWith(2, {
      method: 'PUT',
      path: '/_context_engine/ai_index/a%2Fb',
      body: record,
    });
  });

  it('GETs a record in a space and maps 404 to undefined', async () => {
    esClient.transport.request.mockResolvedValueOnce({ ...record, id: 'support' });
    esClient.transport.request.mockRejectedValueOnce(responseError(404));

    await expect(getAiIndexRecord(esClient, { id: 'support', space: 'team' })).resolves.toEqual({
      ...record,
      id: 'support',
    });
    await expect(
      getAiIndexRecord(esClient, { id: 'support', space: 'team' })
    ).resolves.toBeUndefined();

    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_context_engine/ai_index/support',
      querystring: { space: 'team' },
    });
  });

  it('rethrows non-404 errors from GET', async () => {
    esClient.transport.request.mockRejectedValue(responseError(500));

    await expect(getAiIndexRecord(esClient, { id: 'support', space: 'team' })).rejects.toThrow();
  });

  it('lists records with only the filters given', async () => {
    esClient.transport.request.mockResolvedValue({ count: 0, results: [] });

    await listAiIndexRecords(esClient);
    await listAiIndexRecords(esClient, { space: 'team', dest: 'ai-index-idx-support', size: 5 });

    expect(esClient.transport.request).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: '/_context_engine/ai_index',
      querystring: { size: 100 },
    });
    expect(esClient.transport.request).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: '/_context_engine/ai_index',
      querystring: { space: 'team', dest: 'ai-index-idx-support', size: 5 },
    });
  });

  it('DELETEs a record in a space and reports a 404 as false', async () => {
    esClient.transport.request.mockResolvedValueOnce({ acknowledged: true });
    esClient.transport.request.mockRejectedValueOnce(responseError(404));

    await expect(deleteAiIndexRecord(esClient, { id: 'support', space: 'team' })).resolves.toBe(
      true
    );
    await expect(deleteAiIndexRecord(esClient, { id: 'support', space: 'team' })).resolves.toBe(
      false
    );

    expect(esClient.transport.request).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/_context_engine/ai_index/support',
      querystring: { space: 'team' },
    });
  });
});
