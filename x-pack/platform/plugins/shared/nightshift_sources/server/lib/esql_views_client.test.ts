/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import { isBoom } from '@hapi/boom';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { EsqlViewsClient } from './esql_views_client';

const makeEsError = (statusCode: number, type: string, reason: string) =>
  new errors.ResponseError({
    statusCode,
    headers: {},
    warnings: [],
    meta: {} as unknown as TransportResult['meta'],
    body: { error: { type, reason } },
  } as TransportResult);

describe('EsqlViewsClient', () => {
  const setup = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const client = new EsqlViewsClient(esClient, { baseDelayMs: 1 });
    return { esClient, client };
  };

  describe('getView', () => {
    it('returns the view when ES answers with it', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockResponse({
        views: [{ name: '$.nightshift.sources.a', query: 'FROM logs-*' }],
      });

      await expect(client.getView('$.nightshift.sources.a')).resolves.toEqual({
        name: '$.nightshift.sources.a',
        query: 'FROM logs-*',
      });
      expect(esClient.esql.getView).toHaveBeenCalledWith(
        { name: '$.nightshift.sources.a' },
        { ignore: [404] }
      );
    });

    it('returns undefined when ES answers 200 with no views', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockResponse({ views: [] });

      await expect(client.getView('$.nightshift.sources.a')).resolves.toBeUndefined();
    });

    it('returns undefined when the ignored 404 body comes back instead of a view list', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockResponse({
        error: { type: 'resource_not_found_exception', reason: 'no such view' },
        status: 404,
      } as never);

      await expect(client.getView('$.nightshift.sources.a')).resolves.toBeUndefined();
    });

    it('maps a 403 to a Boom forbidden error', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockRejectedValue(
        makeEsError(403, 'security_exception', 'unauthorized for user')
      );

      await expect(client.getView('$.nightshift.sources.a')).rejects.toMatchObject({
        output: { statusCode: 403 },
        message: expect.stringContaining('unauthorized for user'),
      });
    });
  });

  describe('putView', () => {
    it('retries a 409 and succeeds', async () => {
      const { esClient, client } = setup();
      esClient.esql.putView
        .mockRejectedValueOnce(makeEsError(409, 'concurrent_modification_exception', 'busy'))
        .mockResponseOnce({ acknowledged: true });

      await expect(
        client.putView('$.nightshift.sources.a', 'FROM logs-*')
      ).resolves.toBeUndefined();
      expect(esClient.esql.putView).toHaveBeenCalledTimes(2);
      expect(esClient.esql.putView).toHaveBeenCalledWith({
        name: '$.nightshift.sources.a',
        query: 'FROM logs-*',
      });
    });

    it('does not retry a 400 and maps it to Boom badRequest', async () => {
      const { esClient, client } = setup();
      esClient.esql.putView.mockRejectedValue(makeEsError(400, 'parsing_exception', 'bad query'));

      const promise = client.putView('$.nightshift.sources.a', 'FROM |');
      await expect(promise).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('bad query'),
      });
      expect(esClient.esql.putView).toHaveBeenCalledTimes(1);
    });

    it('gives up after three retryable failures', async () => {
      const { esClient, client } = setup();
      esClient.esql.putView.mockRejectedValue(
        makeEsError(409, 'concurrent_modification_exception', 'busy')
      );

      const error = await client.putView('$.nightshift.sources.a', 'FROM logs-*').catch((e) => e);
      expect(isBoom(error)).toBe(true);
      expect(error.output.statusCode).toBe(409);
      expect(esClient.esql.putView).toHaveBeenCalledTimes(3);
    });
  });

  describe('deleteView', () => {
    it('ignores a missing view', async () => {
      const { esClient, client } = setup();
      esClient.esql.deleteView.mockResponse({ acknowledged: true });

      await expect(client.deleteView('$.nightshift.sources.a')).resolves.toBeUndefined();
      expect(esClient.esql.deleteView).toHaveBeenCalledWith(
        { name: '$.nightshift.sources.a' },
        { ignore: [404] }
      );
    });
  });
});
