/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { streamsGetSignificantEventsStepDefinition } from './streams_get_significant_events_step';

const mockMakeKibanaRequest = jest.fn();

const createMockContext = (
  input: {
    name: string;
    from: string;
    to: string;
    bucketSize: string;
    query?: string;
  } = {
    name: 'logs',
    from: '2024-01-01T00:00:00Z',
    to: '2024-01-02T00:00:00Z',
    bucketSize: '1h',
  }
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
  stepType: 'streams.getSignificantEvents',
});

describe('streamsGetSignificantEventsStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handler', () => {
    it('should successfully get significant events', async () => {
      const mockResponse = {
        significant_events: [
          {
            stream_name: 'logs',
            kql: 'error:*',
            occurrences: [{ date: '2024-01-01T00:00:00Z', count: 5 }],
            change_points: {},
          },
        ],
        aggregated_occurrences: [{ date: '2024-01-01T00:00:00Z', count: 5 }],
      };

      mockMakeKibanaRequest.mockResolvedValueOnce(mockResponse);

      const context = createMockContext();
      const result = await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(result.output).toEqual(mockResponse);
      expect(result.error).toBeUndefined();
      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/api/streams/logs/significant_events',
        method: 'GET',
        query: {
          from: '2024-01-01T00:00:00Z',
          to: '2024-01-02T00:00:00Z',
          bucketSize: '1h',
          query: undefined,
        },
      });
      expect(context.logger.debug).toHaveBeenCalledWith(
        'Fetching significant events for stream: logs'
      );
    });

    it('should include query parameters in the request', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({
        significant_events: [],
        aggregated_occurrences: [],
      });

      const context = createMockContext({
        name: 'logs',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        bucketSize: '1h',
        query: 'severity:error',
      });
      await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/api/streams/logs/significant_events',
        method: 'GET',
        query: {
          from: '2024-01-01T00:00:00Z',
          to: '2024-01-02T00:00:00Z',
          bucketSize: '1h',
          query: 'severity:error',
        },
      });
    });

    it('should handle empty significant events', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({
        significant_events: [],
        aggregated_occurrences: [],
      });

      const context = createMockContext();
      const result = await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(result.output).toEqual({
        significant_events: [],
        aggregated_occurrences: [],
      });
      expect(result.error).toBeUndefined();
    });

    it('should handle API error response', async () => {
      mockMakeKibanaRequest.mockRejectedValueOnce(
        new Error('Kibana API request failed with status 403 Forbidden: Access denied')
      );

      const context = createMockContext();
      const result = await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('403');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      mockMakeKibanaRequest.mockRejectedValueOnce(new Error('Timeout'));

      const context = createMockContext();
      const result = await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Timeout');
      expect(context.logger.error).toHaveBeenCalled();
    });

    it('should URL encode stream names with special characters', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({
        significant_events: [],
        aggregated_occurrences: [],
      });

      const context = createMockContext({
        name: 'logs/test',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        bucketSize: '1h',
      });
      await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/api/streams/logs%2Ftest/significant_events',
        method: 'GET',
        query: {
          from: '2024-01-01T00:00:00Z',
          to: '2024-01-02T00:00:00Z',
          bucketSize: '1h',
          query: undefined,
        },
      });
    });

    it('should not include query parameter if not provided', async () => {
      mockMakeKibanaRequest.mockResolvedValueOnce({
        significant_events: [],
        aggregated_occurrences: [],
      });

      const context = createMockContext({
        name: 'logs',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        bucketSize: '1h',
      });
      await streamsGetSignificantEventsStepDefinition.handler(context);

      expect(mockMakeKibanaRequest).toHaveBeenCalledWith({
        path: '/api/streams/logs/significant_events',
        method: 'GET',
        query: {
          from: '2024-01-01T00:00:00Z',
          to: '2024-01-02T00:00:00Z',
          bucketSize: '1h',
          query: undefined,
        },
      });
    });
  });

  describe('schema validation', () => {
    it('should have correct step type ID', () => {
      expect(streamsGetSignificantEventsStepDefinition.id).toBe('streams.getSignificantEvents');
    });

    it('should validate input schema with required fields', () => {
      const parseResult = streamsGetSignificantEventsStepDefinition.inputSchema.safeParse({
        name: 'logs',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        bucketSize: '1h',
      });
      expect(parseResult.success).toBe(true);
    });

    it('should validate input schema with optional query', () => {
      const parseResult = streamsGetSignificantEventsStepDefinition.inputSchema.safeParse({
        name: 'logs',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-02T00:00:00Z',
        bucketSize: '1h',
        query: 'severity:error',
      });
      expect(parseResult.success).toBe(true);
    });

    it('should reject input without required fields', () => {
      const parseResult = streamsGetSignificantEventsStepDefinition.inputSchema.safeParse({
        name: 'logs',
      });
      expect(parseResult.success).toBe(false);
    });

    it('should validate output schema', () => {
      const output = {
        significant_events: [{ stream_name: 'logs' }],
        aggregated_occurrences: [{ date: '2024-01-01', count: 5 }],
      };

      const parseResult = streamsGetSignificantEventsStepDefinition.outputSchema.safeParse(output);
      expect(parseResult.success).toBe(true);
    });
  });
});
