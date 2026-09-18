/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { detectCapabilities, detectRerankCapability } from './capabilities';

describe('capabilities', () => {
  describe('detectCapabilities', () => {
    it('detects semantic_text fields', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({
          fields: {
            message: {
              semantic_text: {
                type: 'semantic_text',
                searchable: true,
                aggregatable: false,
              },
            },
          },
        }),
      } as unknown as ElasticsearchClient;

      const result = await detectCapabilities(mockEsClient, 'logs-*');

      expect(result).toEqual({
        hasSemanticCapability: true,
        hasPatternCapability: false,
      });
      expect(mockEsClient.fieldCaps).toHaveBeenCalledWith({
        index: 'logs-*',
        fields: ['*'],
      });
    });

    it('detects pattern_text fields', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({
          fields: {
            message: {
              pattern_text: {
                type: 'pattern_text',
                searchable: true,
                aggregatable: false,
              },
            },
          },
        }),
      } as unknown as ElasticsearchClient;

      const result = await detectCapabilities(mockEsClient, 'logs-*');

      expect(result).toEqual({
        hasSemanticCapability: false,
        hasPatternCapability: true,
      });
    });

    it('detects both capabilities', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({
          fields: {
            message: {
              semantic_text: {
                type: 'semantic_text',
                searchable: true,
                aggregatable: false,
              },
            },
            log_message: {
              pattern_text: {
                type: 'pattern_text',
                searchable: true,
                aggregatable: false,
              },
            },
          },
        }),
      } as unknown as ElasticsearchClient;

      const result = await detectCapabilities(mockEsClient, 'logs-*');

      expect(result).toEqual({
        hasSemanticCapability: true,
        hasPatternCapability: true,
      });
    });

    it('detects fields across multiple field types', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({
          fields: {
            'event.message': {
              semantic_text: {
                type: 'semantic_text',
                searchable: true,
                aggregatable: false,
              },
            },
            'message.semantic': {
              semantic_text: {
                type: 'semantic_text',
                searchable: true,
                aggregatable: false,
              },
            },
          },
        }),
      } as unknown as ElasticsearchClient;

      const result = await detectCapabilities(mockEsClient, 'logs-*');

      expect(result).toEqual({
        hasSemanticCapability: true,
        hasPatternCapability: false,
      });
    });

    it('returns false for both when target does not exist', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockRejectedValue(new Error('index_not_found_exception')),
      } as unknown as ElasticsearchClient;

      const result = await detectCapabilities(mockEsClient, 'non-existent-*');

      expect(result).toEqual({
        hasSemanticCapability: false,
        hasPatternCapability: false,
      });
    });

    it('returns false for both when no fields exist', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({
          fields: {},
        }),
      } as unknown as ElasticsearchClient;

      const result = await detectCapabilities(mockEsClient, 'logs-*');

      expect(result).toEqual({
        hasSemanticCapability: false,
        hasPatternCapability: false,
      });
    });

    it('returns false when only standard field types exist', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({
          fields: {
            message: {
              text: {
                type: 'text',
                searchable: true,
                aggregatable: false,
              },
            },
            timestamp: {
              date: {
                type: 'date',
                searchable: true,
                aggregatable: true,
              },
            },
          },
        }),
      } as unknown as ElasticsearchClient;

      const result = await detectCapabilities(mockEsClient, 'logs-*');

      expect(result).toEqual({
        hasSemanticCapability: false,
        hasPatternCapability: false,
      });
    });

    it('detects capabilities when field has conflicting types across indices', async () => {
      const mockEsClient = {
        fieldCaps: jest.fn().mockResolvedValue({
          fields: {
            message: {
              semantic_text: {
                type: 'semantic_text',
                searchable: true,
                aggregatable: false,
              },
              text: {
                type: 'text',
                searchable: true,
                aggregatable: false,
              },
            },
            content: {
              pattern_text: {
                type: 'pattern_text',
                searchable: true,
                aggregatable: false,
              },
              keyword: {
                type: 'keyword',
                searchable: true,
                aggregatable: true,
              },
            },
          },
        }),
      } as unknown as ElasticsearchClient;

      const result = await detectCapabilities(mockEsClient, 'logs-*');

      expect(result).toEqual({
        hasSemanticCapability: true,
        hasPatternCapability: true,
      });
    });
  });

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
