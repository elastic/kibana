/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getDocumentById } from './get_documents';

describe('getDocumentById', () => {
  describe('CCS targets', () => {
    it('uses _search with term query for a CCS index', async () => {
      const esClient = {
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: 'doc-123',
                _index: 'remote_cluster:logs-test',
                _source: { message: 'hello', level: 'info' },
              },
            ],
          },
        }),
        get: jest.fn(),
      } as unknown as ElasticsearchClient;

      const result = await getDocumentById({
        id: 'doc-123',
        index: 'remote_cluster:logs-test',
        esClient,
      });

      // Should use _search, not _get
      expect(esClient.search).toHaveBeenCalledWith({
        index: 'remote_cluster:logs-test',
        size: 1,
        query: { term: { _id: 'doc-123' } },
      });
      expect(esClient.get).not.toHaveBeenCalled();

      expect(result).toEqual({
        id: 'doc-123',
        index: 'remote_cluster:logs-test',
        found: true,
        _source: { message: 'hello', level: 'info' },
      });
    });

    it('returns not found when _search returns no hits for a CCS index', async () => {
      const esClient = {
        search: jest.fn().mockResolvedValue({
          hits: { hits: [] },
        }),
        get: jest.fn(),
      } as unknown as ElasticsearchClient;

      const result = await getDocumentById({
        id: 'nonexistent',
        index: 'remote_cluster:logs-test',
        esClient,
      });

      expect(result).toEqual({
        id: 'nonexistent',
        index: 'remote_cluster:logs-test',
        found: false,
      });
    });
  });

  describe('local targets', () => {
    it('uses _get API for a local index', async () => {
      const esClient = {
        search: jest.fn(),
        get: jest.fn().mockResolvedValue({
          body: {
            _id: 'doc-456',
            _index: 'my-local-index',
            _source: { title: 'test' },
          },
          statusCode: 200,
        }),
      } as unknown as ElasticsearchClient;

      const result = await getDocumentById({
        id: 'doc-456',
        index: 'my-local-index',
        esClient,
      });

      // Should use _get, not _search
      expect(esClient.get).toHaveBeenCalledWith(
        { id: 'doc-456', index: 'my-local-index' },
        { ignore: [404], meta: true }
      );
      expect(esClient.search).not.toHaveBeenCalled();

      expect(result).toEqual({
        id: 'doc-456',
        index: 'my-local-index',
        found: true,
        _source: { title: 'test' },
      });
    });

    it('returns not found when _get returns 404 for a local index', async () => {
      const esClient = {
        search: jest.fn(),
        get: jest.fn().mockResolvedValue({
          body: {},
          statusCode: 404,
        }),
      } as unknown as ElasticsearchClient;

      const result = await getDocumentById({
        id: 'missing',
        index: 'my-local-index',
        esClient,
      });

      expect(result).toEqual({
        id: 'missing',
        index: 'my-local-index',
        found: false,
      });
    });
  });
});
