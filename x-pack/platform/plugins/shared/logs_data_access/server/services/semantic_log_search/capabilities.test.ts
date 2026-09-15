/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { detectRerankCapability } from './capabilities';

describe('capabilities', () => {
  describe('detectRerankCapability', () => {
    it('returns true when rerank endpoint exists', async () => {
      const mockEsClient = {
        inference: {
          get: jest.fn().mockResolvedValue({
            endpoints: [
              {
                inference_id: '.rerank-v1-elasticsearch',
                task_type: 'rerank',
              },
            ],
          }),
        },
      } as unknown as ElasticsearchClient;

      const result = await detectRerankCapability(mockEsClient);

      expect(result).toBe(true);
      expect(mockEsClient.inference.get).toHaveBeenCalledWith({
        inference_id: '.rerank-v1-elasticsearch',
      });
    });

    it('returns false when rerank endpoint does not exist', async () => {
      const mockEsClient = {
        inference: {
          get: jest.fn().mockRejectedValue(new Error('Not found')),
        },
      } as unknown as ElasticsearchClient;

      const result = await detectRerankCapability(mockEsClient);

      expect(result).toBe(false);
    });

    it('returns false when endpoints array is empty', async () => {
      const mockEsClient = {
        inference: {
          get: jest.fn().mockResolvedValue({
            endpoints: [],
          }),
        },
      } as unknown as ElasticsearchClient;

      const result = await detectRerankCapability(mockEsClient);

      expect(result).toBe(false);
    });

    it('returns false when endpoints is undefined', async () => {
      const mockEsClient = {
        inference: {
          get: jest.fn().mockResolvedValue({}),
        },
      } as unknown as ElasticsearchClient;

      const result = await detectRerankCapability(mockEsClient);

      expect(result).toBe(false);
    });
  });
});
