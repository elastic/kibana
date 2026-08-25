/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { createEsqlSchemaCallbacks } from './esql_schema_callbacks';

const esResponseError = (statusCode: number) =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode,
      body: { error: { type: 'test_exception', reason: `status ${statusCode}` } },
    })
  );

describe('createEsqlSchemaCallbacks', () => {
  it('retrieves canonical ES|QL columns without mapping field-capability types', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.fieldCaps.mockResolvedValue({ indices: ['logs-2026'], fields: {} });
    esClient.esql.query.mockResolvedValue({
      columns: [
        { name: 'count', type: 'integer' },
        { name: 'ratio', type: 'double' },
        { name: 'category', type: 'keyword' },
      ],
      values: [],
    });
    const abortSignal = new AbortController().signal;
    const { callbacks } = createEsqlSchemaCallbacks({
      esClient,
      abortSignal,
      retryDelayMs: 0,
    });

    await expect(callbacks.getColumnsFor?.({ query: 'FROM logs-*' })).resolves.toEqual([
      { name: 'count', type: 'integer', userDefined: false, hasConflict: false },
      { name: 'ratio', type: 'double', userDefined: false, hasConflict: false },
      { name: 'category', type: 'keyword', userDefined: false, hasConflict: false },
    ]);
    expect(esClient.fieldCaps).toHaveBeenCalledWith(
      {
        index: 'logs-*',
        fields: ['_none_'],
        allow_no_indices: false,
        ignore_unavailable: false,
      },
      { signal: abortSignal }
    );
    expect(esClient.esql.query).toHaveBeenCalledWith(
      { query: 'FROM logs-* | LIMIT 0', format: 'json' },
      { signal: abortSignal }
    );
  });

  it('returns no columns when the callback receives no query', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const { callbacks } = createEsqlSchemaCallbacks({ esClient, retryDelayMs: 0 });

    await expect(callbacks.getColumnsFor?.()).resolves.toEqual([]);
    expect(esClient.fieldCaps).not.toHaveBeenCalled();
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('propagates strict source-existence failures without requesting columns', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const error = new Error('no such index [missing-*]');
    esClient.fieldCaps.mockRejectedValue(error);
    const { callbacks } = createEsqlSchemaCallbacks({ esClient, retryDelayMs: 0 });

    await expect(callbacks.getColumnsFor?.({ query: 'FROM missing-*' })).rejects.toBe(error);
    expect(esClient.fieldCaps).toHaveBeenCalledTimes(3);
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });

  it('deduplicates source-existence checks within one verification', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.fieldCaps.mockResolvedValue({ indices: ['logs-2026'], fields: {} });
    esClient.esql.query.mockResolvedValue({ columns: [], values: [] });
    const { callbacks } = createEsqlSchemaCallbacks({ esClient, retryDelayMs: 0 });

    await callbacks.getColumnsFor?.({ query: 'FROM logs-*' });
    await callbacks.getColumnsFor?.({ query: 'FROM logs-* | KEEP message' });

    expect(esClient.fieldCaps).toHaveBeenCalledTimes(1);
    expect(esClient.esql.query).toHaveBeenCalledTimes(2);
  });

  it('retries transient source, column, and policy failures', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.fieldCaps
      .mockRejectedValueOnce(esResponseError(429))
      .mockResolvedValue({ indices: ['logs-2026'], fields: {} });
    esClient.esql.query
      .mockRejectedValueOnce(esResponseError(503))
      .mockResolvedValue({ columns: [], values: [] });
    esClient.enrich.getPolicy
      .mockRejectedValueOnce(esResponseError(500))
      .mockResolvedValue({ policies: [] });
    const { callbacks } = createEsqlSchemaCallbacks({ esClient, retryDelayMs: 0 });

    await expect(callbacks.getColumnsFor?.({ query: 'FROM logs-*' })).resolves.toEqual([]);
    await expect(callbacks.getPolicies?.()).resolves.toEqual([]);

    expect(esClient.fieldCaps).toHaveBeenCalledTimes(2);
    expect(esClient.esql.query).toHaveBeenCalledTimes(2);
    expect(esClient.enrich.getPolicy).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable response errors', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.fieldCaps.mockRejectedValue(esResponseError(403));
    const { callbacks } = createEsqlSchemaCallbacks({ esClient, retryDelayMs: 0 });

    await expect(callbacks.getColumnsFor?.({ query: 'FROM logs-*' })).rejects.toBeInstanceOf(
      errors.ResponseError
    );
    expect(esClient.fieldCaps).toHaveBeenCalledTimes(1);
  });
});
