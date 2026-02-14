/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  STREAMS_SUGGESTION_TASK_TYPE,
  getStreamsSuggestionTaskId,
  type StreamsSuggestionTaskParams,
  type StreamsSuggestionTaskPayload,
  type StreamSuggestionResult,
  type DashboardEngineResult,
  type MappingEngineResult,
} from './streams_suggestion';

describe('streams_suggestion', () => {
  describe('STREAMS_SUGGESTION_TASK_TYPE', () => {
    it('should be a valid constant', () => {
      expect(STREAMS_SUGGESTION_TASK_TYPE).toBe('streams_suggestion');
    });
  });

  describe('getStreamsSuggestionTaskId', () => {
    it('should generate task id from stream name', () => {
      expect(getStreamsSuggestionTaskId('logs')).toBe('streams_suggestion_logs');
    });

    it('should handle stream names with dots', () => {
      expect(getStreamsSuggestionTaskId('logs.nginx')).toBe('streams_suggestion_logs.nginx');
    });

    it('should handle stream names with hyphens', () => {
      expect(getStreamsSuggestionTaskId('my-stream')).toBe('streams_suggestion_my-stream');
    });
  });

  describe('type definitions', () => {
    it('StreamsSuggestionTaskParams should accept valid params', () => {
      const params: StreamsSuggestionTaskParams = {
        connectorId: 'connector-123',
        streamName: 'logs',
        start: Date.now() - 3600000,
        end: Date.now(),
      };
      expect(params.connectorId).toBe('connector-123');
      expect(params.streamName).toBe('logs');
      expect(typeof params.start).toBe('number');
      expect(typeof params.end).toBe('number');
    });

    it('StreamSuggestionResult should accept created status', () => {
      const result: StreamSuggestionResult = {
        name: 'logs.nginx',
        status: 'created',
      };
      expect(result.status).toBe('created');
    });

    it('StreamSuggestionResult should accept failed status with error', () => {
      const result: StreamSuggestionResult = {
        name: 'logs.error',
        status: 'failed',
        error: 'Failed to create stream',
      };
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Failed to create stream');
    });

    it('StreamSuggestionResult should accept engine results', () => {
      const dashboardResult: DashboardEngineResult = {
        streamName: 'logs.nginx',
        inputType: 'ingest',
        dashboardSuggestion: { rawDashboard: {} },
        warnings: [],
      };

      const mappingResult: MappingEngineResult = {
        streamName: 'logs.nginx',
        stats: {
          totalFields: 10,
          mappedCount: 8,
          skippedCount: 1,
          errorCount: 1,
        },
        fields: [
          { name: 'host.name', status: 'mapped', type: 'keyword' },
          { name: 'temp_field', status: 'skipped', reason: 'temporary' },
        ],
        applied: true,
      };

      const result: StreamSuggestionResult = {
        name: 'logs.nginx',
        status: 'created',
        dashboardResult,
        mappingResult,
      };

      expect(result.dashboardResult?.inputType).toBe('ingest');
      expect(result.mappingResult?.applied).toBe(true);
    });

    it('DashboardEngineResult should accept error state', () => {
      const result: DashboardEngineResult = {
        streamName: 'logs.error',
        inputType: 'ingest',
        warnings: [],
        error: 'LLM failed to generate dashboard',
      };
      expect(result.error).toBe('LLM failed to generate dashboard');
      expect(result.dashboardSuggestion).toBeUndefined();
    });

    it('MappingEngineResult should accept error state', () => {
      const result: MappingEngineResult = {
        streamName: 'logs.error',
        stats: {
          totalFields: 0,
          mappedCount: 0,
          skippedCount: 0,
          errorCount: 1,
        },
        fields: [],
        applied: false,
        error: 'No documents found for sampling',
      };
      expect(result.error).toBe('No documents found for sampling');
      expect(result.applied).toBe(false);
    });

    it('StreamsSuggestionTaskPayload should accept valid payload', () => {
      const payload: StreamsSuggestionTaskPayload = {
        streams: [
          { name: 'logs.nginx', status: 'created' },
          { name: 'logs.apache', status: 'created' },
          { name: 'logs.error', status: 'failed', error: 'Fork failed' },
        ],
        tokensUsed: { prompt: 1000, completion: 500, cached: 200 },
      };
      expect(payload.streams).toHaveLength(3);
      expect(payload.tokensUsed?.prompt).toBe(1000);
    });

    it('StreamsSuggestionTaskPayload should accept empty streams array', () => {
      const payload: StreamsSuggestionTaskPayload = {
        streams: [],
      };
      expect(payload.streams).toHaveLength(0);
      expect(payload.tokensUsed).toBeUndefined();
    });
  });
});
