/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { streamsListFeaturesStepDefinition } from './streams_list_features_step';

const mockMakeKibanaRequest = jest.fn();

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
    getFakeRequest: jest.fn(),
    makeKibanaRequest: mockMakeKibanaRequest,
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

      mockMakeKibanaRequest.mockResolvedValueOnce({ features: mockFeatures });

      const context = createMockContext({ name: 'logs' });
      const result = await streamsListFeaturesStepDefinition.handler(context);

      expect(result.output).toEqual({ features: mockFeatures });
      expect(result.error).toBeUndefined();
      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/internal/streams/logs/features',
        method: 'GET',
        query: {
          type: undefined,
        },
      });
      expect(context.logger.debug).toHaveBeenCalledWith('Fetching features for stream: logs');
      expect(context.logger.debug).toHaveBeenCalledWith(
        'Successfully fetched 2 features for stream: logs'
      );
    });

    it('should list features with type filter', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({ features: [] });

      const context = createMockContext({ name: 'logs', type: 'pattern' });
      await streamsListFeaturesStepDefinition.handler(context);

      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/internal/streams/logs/features',
        method: 'GET',
        query: {
          type: 'pattern',
        },
      });
    });

    it('should URL encode stream names with special characters', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({ features: [] });

      const context = createMockContext({ name: 'logs/test' });
      await streamsListFeaturesStepDefinition.handler(context);

      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/internal/streams/logs%2Ftest/features',
        method: 'GET',
        query: {
          type: undefined,
        },
      });
    });

    it('should handle empty features list', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({ features: [] });

      const context = createMockContext({ name: 'empty-stream' });
      const result = await streamsListFeaturesStepDefinition.handler(context);

      expect(result.output).toEqual({ features: [] });
      expect(result.error).toBeUndefined();
    });

    it('should handle stream not found error', async () => {
      mockMakeKibanaRequest.mockRejectedValueOnce(
        new Error('Kibana API request failed with status 404 Not Found: Stream not found')
      );

      const context = createMockContext({ name: 'nonexistent' });
      const result = await streamsListFeaturesStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('404');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockMakeKibanaRequest.mockRejectedValueOnce(new Error('Connection refused'));

      const context = createMockContext({ name: 'logs' });
      const result = await streamsListFeaturesStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Connection refused');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should call makeKibanaRequest with correct parameters', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({ features: [] });

      const context = createMockContext({ name: 'logs' });
      await streamsListFeaturesStepDefinition.handler(context);

      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/internal/streams/logs/features',
        method: 'GET',
        query: {
          type: undefined,
        },
      });
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
