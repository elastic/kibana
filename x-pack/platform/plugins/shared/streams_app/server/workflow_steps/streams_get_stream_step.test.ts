/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { streamsGetStreamStepDefinition } from './streams_get_stream_step';

const mockMakeKibanaRequest = jest.fn();

const createMockContext = (
  input: { name: string } = { name: 'logs' }
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
  stepType: 'streams.getStream',
});

describe('streamsGetStreamStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should successfully get a stream', async () => {
      const mockStream = {
        name: 'logs',
        type: 'wired',
        definition: { fields: [] },
        features: [],
        dashboards: [],
      };

      mockMakeKibanaRequest.mockResolvedValueOnce(mockStream);

      const context = createMockContext({ name: 'logs' });
      const result = await streamsGetStreamStepDefinition.handler(context);

      expect(result.output).toEqual({ stream: mockStream });
      expect(result.error).toBeUndefined();
      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/api/streams/logs',
        method: 'GET',
      });
      expect(context.logger.debug).toHaveBeenCalledWith('Fetching stream: logs');
      expect(context.logger.debug).toHaveBeenCalledWith('Successfully fetched stream: logs');
    });

    it('should URL encode stream names with special characters', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({ name: 'logs/test' });

      const context = createMockContext({ name: 'logs/test' });
      await streamsGetStreamStepDefinition.handler(context);

      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/api/streams/logs%2Ftest',
        method: 'GET',
      });
    });

    it('should handle stream not found error', async () => {
      mockMakeKibanaRequest.mockRejectedValueOnce(
        new Error('Kibana API request failed with status 404 Not Found: Stream not found')
      );

      const context = createMockContext({ name: 'nonexistent' });
      const result = await streamsGetStreamStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('404');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockMakeKibanaRequest.mockRejectedValueOnce(new Error('Connection refused'));

      const context = createMockContext({ name: 'logs' });
      const result = await streamsGetStreamStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Connection refused');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should call makeKibanaRequest with correct parameters', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({ name: 'logs' });

      const context = createMockContext({ name: 'logs' });
      await streamsGetStreamStepDefinition.handler(context);

      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/api/streams/logs',
        method: 'GET',
      });
    });
  });

  describe('schema validation', () => {
    it('should have correct step type ID', () => {
      expect(streamsGetStreamStepDefinition.id).toBe('streams.getStream');
    });

    it('should validate input schema with name', () => {
      const parseResult = streamsGetStreamStepDefinition.inputSchema.safeParse({ name: 'logs' });
      expect(parseResult.success).toBe(true);
    });

    it('should reject input without name', () => {
      const parseResult = streamsGetStreamStepDefinition.inputSchema.safeParse({});
      expect(parseResult.success).toBe(false);
    });

    it('should validate output schema', () => {
      const output = {
        stream: { name: 'test-stream', type: 'wired' },
      };

      const parseResult = streamsGetStreamStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });
  });
});
