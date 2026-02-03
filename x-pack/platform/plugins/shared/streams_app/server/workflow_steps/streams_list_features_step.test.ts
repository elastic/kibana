/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { streamsListFeaturesStepDefinition } from './streams_list_features_step';

// Mock the fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;

const createMockContext = (
  input: { name: string; type?: string } = { name: 'logs' }
): StepHandlerContext<any, any> => ({
  config: {},
  input,
  rawInput: input,
  contextManager: {
    renderInputTemplate: jest.fn((templateInput) => templateInput),
    getContext: jest.fn().mockReturnValue({
      kibanaUrl: 'http://localhost:5601',
    }),
    getScopedEsClient: jest.fn(),
    getFakeRequest: jest.fn().mockReturnValue({
      headers: {
        authorization: 'Bearer test-token',
        cookie: 'test-cookie',
      },
    } as unknown as KibanaRequest),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'streams.listFeatures',
});

describe('streamsListFeaturesStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should successfully list features', async () => {
      const mockFeatures = [
        {
          id: 'feature-1',
          type: 'pattern',
          name: 'Error Pattern',
          status: 'active',
        },
        {
          id: 'feature-2',
          type: 'pattern',
          name: 'Warning Pattern',
          status: 'active',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ features: mockFeatures }),
      });

      const context = createMockContext({ name: 'logs' });
      const result = await streamsListFeaturesStepDefinition.handler(context);

      expect(result.output).toEqual({ features: mockFeatures });
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/internal/streams/logs/features',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            authorization: 'Bearer test-token',
            'elastic-api-version': '2023-10-31',
          }),
        })
      );
      expect(context.logger.debug).toHaveBeenCalledWith('Fetching features for stream: logs');
      expect(context.logger.debug).toHaveBeenCalledWith(
        'Successfully fetched 2 features for stream: logs'
      );
    });

    it('should list features with type filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ features: [] }),
      });

      const context = createMockContext({ name: 'logs', type: 'pattern' });
      await streamsListFeaturesStepDefinition.handler(context);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/internal/streams/logs/features?type=pattern',
        expect.any(Object)
      );
    });

    it('should URL encode stream names with special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ features: [] }),
      });

      const context = createMockContext({ name: 'logs/test' });
      await streamsListFeaturesStepDefinition.handler(context);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5601/internal/streams/logs%2Ftest/features',
        expect.any(Object)
      );
    });

    it('should handle empty features list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ features: [] }),
      });

      const context = createMockContext({ name: 'empty-stream' });
      const result = await streamsListFeaturesStepDefinition.handler(context);

      expect(result.output).toEqual({ features: [] });
      expect(result.error).toBeUndefined();
    });

    it('should handle stream not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn().mockResolvedValueOnce('Stream not found'),
      });

      const context = createMockContext({ name: 'nonexistent' });
      const result = await streamsListFeaturesStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('404');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const context = createMockContext({ name: 'logs' });
      const result = await streamsListFeaturesStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Connection refused');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should forward authentication headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ features: [] }),
      });

      const context = createMockContext({ name: 'logs' });
      await streamsListFeaturesStepDefinition.handler(context);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer test-token',
            cookie: 'test-cookie',
            'kbn-xsrf': 'true',
          }),
        })
      );
    });
  });

  describe('schema validation', () => {
    it('should have correct step type ID', () => {
      expect(streamsListFeaturesStepDefinition.id).toBe('streams.listFeatures');
    });

    it('should validate input schema with name', () => {
      const parseResult = streamsListFeaturesStepDefinition.inputSchema.safeParse({ name: 'logs' });
      expect(parseResult.success).toBe(true);
    });

    it('should validate input schema with name and type', () => {
      const parseResult = streamsListFeaturesStepDefinition.inputSchema.safeParse({
        name: 'logs',
        type: 'pattern',
      });
      expect(parseResult.success).toBe(true);
    });

    it('should reject input without name', () => {
      const parseResult = streamsListFeaturesStepDefinition.inputSchema.safeParse({});
      expect(parseResult.success).toBe(false);
    });

    it('should validate output schema', () => {
      const output = {
        features: [{ id: 'feature-1', type: 'pattern' }],
      };

      const parseResult = streamsListFeaturesStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });

    it('should validate output schema with empty features array', () => {
      const output = {
        features: [],
      };

      const parseResult = streamsListFeaturesStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });
  });
});
