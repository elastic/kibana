/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { listViews, getViewFields } from './views';

describe('views utils', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  describe('listViews', () => {
    it('returns the views reported by GET _query/view', async () => {
      esClient.esql.getView.mockResolvedValue({
        views: [
          { name: 'logs-proxy-parsed', query: 'FROM logs-* | KEEP status' },
          {
            name: 'errors-only',
            query: 'FROM logs-* | WHERE status >= 400',
            description: 'Non-success responses',
          },
        ],
      } as never);

      const views = await listViews({ esClient });

      expect(esClient.esql.getView).toHaveBeenCalledWith();
      expect(views).toEqual([
        { name: 'logs-proxy-parsed', query: 'FROM logs-* | KEEP status' },
        {
          name: 'errors-only',
          query: 'FROM logs-* | WHERE status >= 400',
          description: 'Non-success responses',
        },
      ]);
    });

    it('returns an empty list when the API is not supported', async () => {
      esClient.esql.getView.mockRejectedValue(new Error('no handler found for uri'));

      const views = await listViews({ esClient });

      expect(views).toEqual([]);
    });

    it('returns an empty list when the response has no views', async () => {
      esClient.esql.getView.mockResolvedValue({} as never);

      const views = await listViews({ esClient });

      expect(views).toEqual([]);
    });
  });

  describe('getViewFields', () => {
    it('introspects columns via `FROM <name> | LIMIT 0` and maps them to fields', async () => {
      esClient.esql.query.mockResolvedValue({
        columns: [
          { name: 'status', type: 'integer' },
          { name: 'host.name', type: 'keyword' },
        ],
        values: [],
      });

      const fields = await getViewFields({ name: 'logs-proxy-parsed', esClient });

      expect(esClient.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'FROM logs-proxy-parsed | LIMIT 0' }),
        expect.anything()
      );
      expect(fields).toEqual([
        { path: 'status', type: 'integer', meta: {} },
        { path: 'host.name', type: 'keyword', meta: {} },
      ]);
    });
  });
});
