/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { hasRequiredFields, getRerankEndpoint } from './capabilities';
import { RERANK_ENDPOINT } from './constants';

describe('capabilities', () => {
  describe('hasRequiredFields', () => {
    it('returns true when message and @timestamp are available', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({
          indices: ['.ds-logs-synth-default-000001'],
          fields: {
            message: {
              match_only_text: {
                type: 'match_only_text',
                searchable: true,
                aggregatable: false,
              },
            },
            '@timestamp': {
              date: {
                type: 'date',
                searchable: true,
                aggregatable: true,
              },
            },
          },
        }),
      } as unknown as ElasticsearchClient;

      const result = await hasRequiredFields(mockEsClient, 'logs-*');

      expect(result).toBe('ok');
      expect(mockEsClient.fieldCaps).toHaveBeenCalledWith({
        index: 'logs-*',
        fields: ['message', '@timestamp'],
      });
    });

    it.each(['message', '@timestamp'])(
      'reports missing_fields when %s is absent from indices that do exist',
      async (missingField) => {
        const mockEsClient = {
          fieldCaps: jest.fn().mockResolvedValue({
            indices: ['.ds-logs-synth-default-000001'],
            fields:
              missingField === 'message'
                ? {
                    '@timestamp': {
                      date: { type: 'date', searchable: true, aggregatable: true },
                    },
                  }
                : {
                    message: {
                      text: { type: 'text', searchable: true, aggregatable: false },
                    },
                  },
          }),
        } as unknown as ElasticsearchClient;

        const result = await hasRequiredFields(mockEsClient, 'logs-*');

        expect(result).toBe('missing_fields');
      }
    );

    it('reports missing_fields when indices exist but expose neither field', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({
          indices: ['.ds-logs-synth-default-000001'],
          fields: {},
        }),
      } as unknown as ElasticsearchClient;

      const result = await hasRequiredFields(mockEsClient, 'logs-*');

      expect(result).toBe('missing_fields');
    });

    it('reports no_matching_indices when a wildcard matches nothing', async () => {
      // Elasticsearch answers 200 with an empty `indices` rather than erroring, because
      // `allow_no_indices` defaults to true for field caps.
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({ indices: [], fields: {} }),
      } as unknown as ElasticsearchClient;

      const result = await hasRequiredFields(mockEsClient, 'logs-does-not-exist-*');

      expect(result).toBe('no_matching_indices');
    });

    it('reports no_matching_indices when a concrete index is absent', async () => {
      // A named index that does not exist answers 404 instead, so both shapes have to be handled
      // or the same condition is reported two different ways.
      const notFound = new errors.ResponseError({
        body: { error: { type: 'index_not_found_exception' } },
        statusCode: 404,
        headers: {},
        meta: {} as any,
        warnings: [],
      });
      const mockEsClient = {
        fieldCaps: jest.fn().mockRejectedValue(notFound),
      } as unknown as ElasticsearchClient;

      const result = await hasRequiredFields(mockEsClient, 'logs-nope');

      expect(result).toBe('no_matching_indices');
    });

    it('normalises a single index name, which the client may return unwrapped', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({
          indices: '.ds-logs-synth-default-000001',
          fields: {},
        }),
      } as unknown as ElasticsearchClient;

      expect(await hasRequiredFields(mockEsClient, 'logs-*')).toBe('missing_fields');
    });

    it('propagates field capability errors that are not a 404, so a 403 is not reported as absent data', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockRejectedValue(new Error('forbidden')),
      } as unknown as ElasticsearchClient;

      await expect(hasRequiredFields(mockEsClient, 'logs-*')).rejects.toThrow('forbidden');
    });
  });

  describe('getRerankEndpoint', () => {
    it('returns the backing service when the rerank endpoint exists', async () => {
      const mockEsClient = {
        inference: {
          get: jest.fn().mockResolvedValue({
            endpoints: [
              {
                inference_id: '.rerank-v1-elasticsearch',
                task_type: 'rerank',
                service: 'elasticsearch',
              },
            ],
          }),
        },
      } as unknown as ElasticsearchClient;

      const result = await getRerankEndpoint(mockEsClient, RERANK_ENDPOINT);

      expect(result).toEqual({ service: 'elasticsearch' });
      expect(mockEsClient.inference.get).toHaveBeenCalledWith({
        inference_id: '.rerank-v1-elasticsearch',
      });
    });

    it('returns undefined when the rerank endpoint does not exist (genuine 404)', async () => {
      const notFoundError = new errors.ResponseError({
        body: { error: { type: 'resource_not_found_exception' } },
        statusCode: 404,
        headers: {},
        meta: {} as any,
        warnings: [],
      });
      const mockEsClient = {
        inference: {
          get: jest.fn().mockRejectedValue(notFoundError),
        },
      } as unknown as ElasticsearchClient;

      const result = await getRerankEndpoint(mockEsClient, RERANK_ENDPOINT);

      expect(result).toBeUndefined();
    });

    it('propagates a 403 authorization error rather than reporting the endpoint as absent', async () => {
      const forbiddenError = new errors.ResponseError({
        body: {
          error: {
            type: 'security_exception',
            reason: 'action [cluster:monitor/xpack/inference/get] is unauthorized',
          },
        },
        statusCode: 403,
        headers: {},
        meta: {} as any,
        warnings: [],
      });
      const mockEsClient = {
        inference: {
          get: jest.fn().mockRejectedValue(forbiddenError),
        },
      } as unknown as ElasticsearchClient;

      await expect(getRerankEndpoint(mockEsClient, RERANK_ENDPOINT)).rejects.toThrow();
    });

    it('returns undefined when endpoints array is empty', async () => {
      const mockEsClient = {
        inference: {
          get: jest.fn().mockResolvedValue({
            endpoints: [],
          }),
        },
      } as unknown as ElasticsearchClient;

      const result = await getRerankEndpoint(mockEsClient, RERANK_ENDPOINT);

      expect(result).toBeUndefined();
    });

    it('returns undefined when endpoints is undefined', async () => {
      const mockEsClient = {
        inference: {
          get: jest.fn().mockResolvedValue({}),
        },
      } as unknown as ElasticsearchClient;

      const result = await getRerankEndpoint(mockEsClient, RERANK_ENDPOINT);

      expect(result).toBeUndefined();
    });
  });
});
