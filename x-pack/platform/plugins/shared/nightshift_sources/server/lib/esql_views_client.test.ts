/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createEsResponseError } from './es_errors.mock';
import { EsqlViewsClient } from './esql_views_client';

const VIEW_NAME = '$.nightshift.sources.a';

describe('EsqlViewsClient', () => {
  const setup = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const client = new EsqlViewsClient(esClient, 1);
    return { esClient, client };
  };

  describe('getView', () => {
    it('returns the view when ES answers with it', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockResponse({ views: [{ name: VIEW_NAME, query: 'FROM logs-*' }] });

      await expect(client.getView(VIEW_NAME)).resolves.toEqual({
        name: VIEW_NAME,
        query: 'FROM logs-*',
      });
      expect(esClient.esql.getView).toHaveBeenCalledWith({ name: VIEW_NAME }, { ignore: [404] });
    });

    it('returns undefined when ES answers 200 with no views', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockResponse({ views: [] });

      await expect(client.getView(VIEW_NAME)).resolves.toBeUndefined();
    });

    it('returns undefined when the ignored 404 body comes back instead of a view list', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockResponse({
        error: { type: 'resource_not_found_exception', reason: 'no such view' },
        status: 404,
      } as never);

      await expect(client.getView(VIEW_NAME)).resolves.toBeUndefined();
    });

    it('maps a 403 to a Boom forbidden error', async () => {
      const { esClient, client } = setup();
      esClient.esql.getView.mockRejectedValue(
        createEsResponseError(403, 'security_exception', 'unauthorized for user')
      );

      await expect(client.getView(VIEW_NAME)).rejects.toMatchObject({
        output: { statusCode: 403 },
        message: expect.stringContaining('unauthorized for user'),
      });
    });
  });

  describe('putView', () => {
    it('retries a 409 and succeeds', async () => {
      const { esClient, client } = setup();
      esClient.esql.putView
        .mockRejectedValueOnce(
          createEsResponseError(409, 'concurrent_modification_exception', 'busy')
        )
        .mockResponseOnce({ acknowledged: true });

      await expect(client.putView(VIEW_NAME, 'FROM logs-*')).resolves.toBeUndefined();
      expect(esClient.esql.putView).toHaveBeenCalledTimes(2);
      expect(esClient.esql.putView).toHaveBeenCalledWith({ name: VIEW_NAME, query: 'FROM logs-*' });
    });

    it('does not retry a 400 and maps it to Boom badRequest', async () => {
      const { esClient, client } = setup();
      esClient.esql.putView.mockRejectedValue(
        createEsResponseError(400, 'parsing_exception', 'bad query')
      );

      await expect(client.putView(VIEW_NAME, 'FROM |')).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('bad query'),
      });
      expect(esClient.esql.putView).toHaveBeenCalledTimes(1);
    });

    it('gives up after three retryable failures', async () => {
      const { esClient, client } = setup();
      esClient.esql.putView.mockRejectedValue(
        createEsResponseError(409, 'concurrent_modification_exception', 'busy')
      );

      const error = await client.putView(VIEW_NAME, 'FROM logs-*').catch((e) => e);
      expect(isBoom(error)).toBe(true);
      expect(error.output.statusCode).toBe(409);
      expect(esClient.esql.putView).toHaveBeenCalledTimes(3);
    });
  });

  describe('deleteView', () => {
    it('ignores a missing view', async () => {
      const { esClient, client } = setup();
      esClient.esql.deleteView.mockResponse({ acknowledged: true });

      await expect(client.deleteView(VIEW_NAME)).resolves.toBeUndefined();
      expect(esClient.esql.deleteView).toHaveBeenCalledWith({ name: VIEW_NAME }, { ignore: [404] });
    });
  });
});
