/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { streamsListStreamsStepDefinition } from './streams_list_streams_step';

const mockMakeKibanaRequest = jest.fn();

const createMockContext = (): StepHandlerContext<any, any> => ({
  config: {},
  input: {},
  rawInput: {},
  contextManager: {
    renderInputTemplate: jest.fn((input) => input),
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
  stepType: 'streams.listStreams',
});

describe('streamsListStreamsStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should successfully list streams', async () => {
      const mockStreams = [
        { name: 'logs', type: 'wired' },
        { name: 'metrics', type: 'classic' },
      ];

      mockMakeKibanaRequest.mockResolvedValueOnce({ streams: mockStreams });

      const context = createMockContext();
      const result = await streamsListStreamsStepDefinition.handler(context);

      expect(result.output).toEqual({ streams: mockStreams });
      expect(result.error).toBeUndefined();
      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/api/streams',
        method: 'GET',
      });
      expect(context.logger.debug).toHaveBeenCalledWith('Fetching list of streams');
      expect(context.logger.debug).toHaveBeenCalledWith('Successfully fetched 2 streams');
    });

    it('should handle empty streams list', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({ streams: [] });

      const context = createMockContext();
      const result = await streamsListStreamsStepDefinition.handler(context);

      expect(result.output).toEqual({ streams: [] });
      expect(result.error).toBeUndefined();
    });

    it('should handle API error response', async () => {
      mockMakeKibanaRequest.mockRejectedValueOnce(
        new Error('Kibana API request failed with status 500 Internal Server Error: Server error')
      );

      const context = createMockContext();
      const result = await streamsListStreamsStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Kibana API request failed');
      expect(result.error?.message).toContain('500');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockMakeKibanaRequest.mockRejectedValueOnce(new Error('Network error'));

      const context = createMockContext();
      const result = await streamsListStreamsStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Network error');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should call makeKibanaRequest with correct parameters', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({ streams: [] });

      const context = createMockContext();
      await streamsListStreamsStepDefinition.handler(context);

      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/api/streams',
        method: 'GET',
      });
    });
  });

  describe('schema validation', () => {
    it('should have correct step type ID', () => {
      expect(streamsListStreamsStepDefinition.id).toBe('streams.listStreams');
    });

    it('should validate input schema with empty object', () => {
      const parseResult = streamsListStreamsStepDefinition.inputSchema.safeParse({});
      expect(parseResult.success).toBe(true);
    });

    it('should validate output schema', () => {
      const output = {
        streams: [{ name: 'test-stream', type: 'wired' }],
      };

      const parseResult = streamsListStreamsStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });
  });
});
