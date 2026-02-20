/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getEsqlView, upsertEsqlView, deleteEsqlView } from './manage_esql_views';

describe('manage_esql_views', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEsqlView', () => {
    it('should call GET /_query/view/{name} and return the view', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      const expectedView = {
        name: '$.my-query-stream',
        query: 'FROM logs-* | LIMIT 100',
      };
      const mockResponse = { views: [expectedView] };
      esClient.transport.request.mockResolvedValueOnce(mockResponse);

      const result = await getEsqlView({
        esClient,
        logger,
        name: '$.my-query-stream',
      });

      expect(esClient.transport.request).toHaveBeenCalledTimes(1);
      expect(esClient.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_query/view/$.my-query-stream',
      });
      expect(result).toEqual(expectedView);
    });
  });

  describe('upsertEsqlView', () => {
    it('should call PUT /_query/view/{name} with the correct query', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();

      await upsertEsqlView({
        esClient,
        logger,
        name: 'my-query-stream',
        query: 'FROM logs-* | LIMIT 100',
      });

      expect(esClient.transport.request).toHaveBeenCalledTimes(1);
      expect(esClient.transport.request).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/_query/view/my-query-stream',
        body: { query: 'FROM logs-* | LIMIT 100' },
      });
    });

    it('should handle complex ES|QL queries', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      const complexQuery = `FROM logs-*
| WHERE @timestamp > NOW() - 1 day
| STATS count = COUNT(*) BY host.name
| SORT count DESC
| LIMIT 10`;

      await upsertEsqlView({
        esClient,
        logger,
        name: 'complex-query-stream',
        query: complexQuery,
      });

      expect(esClient.transport.request).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/_query/view/complex-query-stream',
        body: { query: complexQuery },
      });
    });
  });

  describe('deleteEsqlView', () => {
    it('should call DELETE /_query/view/{name}', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();

      await deleteEsqlView({
        esClient,
        logger,
        name: 'my-query-stream',
      });

      expect(esClient.transport.request).toHaveBeenCalledTimes(1);
      expect(esClient.transport.request).toHaveBeenCalledWith(
        {
          method: 'DELETE',
          path: '/_query/view/my-query-stream',
        },
        {
          ignore: [404],
        }
      );
    });

    it('should ignore 404 errors when view does not exist', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();

      await deleteEsqlView({
        esClient,
        logger,
        name: 'non-existent-view',
      });

      expect(esClient.transport.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ignore: [404],
        })
      );
    });
  });
});
