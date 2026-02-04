/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createAgentBuilderError, AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { TrackingService, ToolCallSource } from './tracking_service';
import { AGENTBUILDER_USAGE_DOMAIN } from './usage_counters';

// Helper to create mock agentExecutionError since createAgentExecutionError isn't exported
const createMockAgentExecutionError = (errCode: AgentExecutionErrorCode) => {
  return createAgentBuilderError(AgentBuilderErrorCode.agentExecutionError, 'Execution error', {
    errCode,
  });
};

describe('TrackingService', () => {
  let mockUsageCounter: jest.Mocked<UsageCounter>;
  let logger: MockedLogger;
  let trackingService: TrackingService;

  beforeEach(() => {
    mockUsageCounter = {
      incrementCounter: jest.fn(),
    } as unknown as jest.Mocked<UsageCounter>;
    logger = loggerMock.create();
    trackingService = new TrackingService(mockUsageCounter, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ToolCallSource enum', () => {
    it('has correct values', () => {
      expect(ToolCallSource.DEFAULT_AGENT).toBe('default_agent');
      expect(ToolCallSource.CUSTOM_AGENT).toBe('custom_agent');
      expect(ToolCallSource.MCP).toBe('mcp');
      expect(ToolCallSource.API).toBe('api');
      expect(ToolCallSource.A2A).toBe('a2a');
    });
  });

  describe('trackToolCall', () => {
    it('increments counter for default_agent source', () => {
      trackingService.trackToolCall('tool-1', ToolCallSource.DEFAULT_AGENT);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_tool_call_default_agent`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('increments counter for custom_agent source', () => {
      trackingService.trackToolCall('tool-2', ToolCallSource.CUSTOM_AGENT);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_tool_call_custom_agent`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('increments counter for mcp source', () => {
      trackingService.trackToolCall('tool-3', ToolCallSource.MCP);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_tool_call_mcp`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('increments counter for api source', () => {
      trackingService.trackToolCall('tool-4', ToolCallSource.API);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_tool_call_api`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('increments counter for a2a source', () => {
      trackingService.trackToolCall('tool-5', ToolCallSource.A2A);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_tool_call_a2a`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('logs debug message on success', () => {
      trackingService.trackToolCall('my-tool', ToolCallSource.DEFAULT_AGENT);

      expect(logger.debug).toHaveBeenCalledWith('Tracked tool call: my-tool from default_agent');
    });

    it('logs error when incrementCounter throws', () => {
      const error = new Error('Counter error');
      mockUsageCounter.incrementCounter.mockImplementation(() => {
        throw error;
      });

      trackingService.trackToolCall('tool-1', ToolCallSource.DEFAULT_AGENT);

      expect(logger.error).toHaveBeenCalledWith('Failed to track tool call: Counter error');
    });
  });

  describe('trackConversationRound', () => {
    it('tracks round 1 in 1-5 bucket', () => {
      trackingService.trackConversationRound('conv-1', 1);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_rounds_1-5`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks round 5 in 1-5 bucket', () => {
      trackingService.trackConversationRound('conv-1', 5);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_rounds_1-5`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks round 6 in 6-10 bucket', () => {
      trackingService.trackConversationRound('conv-1', 6);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_rounds_6-10`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks round 10 in 6-10 bucket', () => {
      trackingService.trackConversationRound('conv-1', 10);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_rounds_6-10`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks round 11 in 11-20 bucket', () => {
      trackingService.trackConversationRound('conv-1', 11);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_rounds_11-20`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks round 20 in 11-20 bucket', () => {
      trackingService.trackConversationRound('conv-1', 20);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_rounds_11-20`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks round 21 in 21-50 bucket', () => {
      trackingService.trackConversationRound('conv-1', 21);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_rounds_21-50`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks round 50 in 21-50 bucket', () => {
      trackingService.trackConversationRound('conv-1', 50);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_rounds_21-50`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks round 51 in 51+ bucket', () => {
      trackingService.trackConversationRound('conv-1', 51);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_rounds_51+`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks round 100 in 51+ bucket', () => {
      trackingService.trackConversationRound('conv-1', 100);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_rounds_51+`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('logs debug message on success', () => {
      trackingService.trackConversationRound('conv-123', 5);

      expect(logger.debug).toHaveBeenCalledWith('Tracked conversation round: conv-123 round 5');
    });

    it('logs error when incrementCounter throws', () => {
      const error = new Error('Counter error');
      mockUsageCounter.incrementCounter.mockImplementation(() => {
        throw error;
      });

      trackingService.trackConversationRound('conv-1', 1);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to track conversation round: Counter error'
      );
    });
  });

  describe('trackQueryStart and trackQueryEnd', () => {
    it('generates a request ID when not provided', () => {
      const requestId = trackingService.trackQueryStart();

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe('string');
      expect(requestId!.length).toBeGreaterThan(0);
    });

    it('uses provided request ID', () => {
      const requestId = trackingService.trackQueryStart('my-request-id');

      expect(requestId).toBe('my-request-id');
    });

    it('logs debug message on trackQueryStart', () => {
      trackingService.trackQueryStart('req-123');
      expect(logger.debug).toHaveBeenCalledWith('Tracked query start: req-123');
    });

    it('tracks query end and increments correct time bucket', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      const requestId = trackingService.trackQueryStart('req-1');

      // Advance time by 500ms (should be <1s bucket)
      jest.setSystemTime(now + 500);
      trackingService.trackQueryEnd(requestId!);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_query_to_result_time_<1s`,
        counterType: 'count',
        incrementBy: 1,
      });

      jest.useRealTimers();
    });

    it('tracks 1-5s bucket correctly', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      const requestId = trackingService.trackQueryStart('req-1');

      jest.setSystemTime(now + 2500);
      trackingService.trackQueryEnd(requestId!);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_query_to_result_time_1-5s`,
        counterType: 'count',
        incrementBy: 1,
      });

      jest.useRealTimers();
    });

    it('tracks 5-10s bucket correctly', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      const requestId = trackingService.trackQueryStart('req-1');

      jest.setSystemTime(now + 7500);
      trackingService.trackQueryEnd(requestId!);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_query_to_result_time_5-10s`,
        counterType: 'count',
        incrementBy: 1,
      });

      jest.useRealTimers();
    });

    it('tracks 10-30s bucket correctly', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      const requestId = trackingService.trackQueryStart('req-1');

      jest.setSystemTime(now + 20000);
      trackingService.trackQueryEnd(requestId!);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_query_to_result_time_10-30s`,
        counterType: 'count',
        incrementBy: 1,
      });

      jest.useRealTimers();
    });

    it('tracks 30s+ bucket correctly', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      const requestId = trackingService.trackQueryStart('req-1');

      jest.setSystemTime(now + 45000);
      trackingService.trackQueryEnd(requestId!);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_query_to_result_time_30s+`,
        counterType: 'count',
        incrementBy: 1,
      });

      jest.useRealTimers();
    });

    it('logs warning when no start time found', () => {
      trackingService.trackQueryEnd('unknown-request-id');

      expect(logger.warn).toHaveBeenCalledWith(
        'No start time found for request: unknown-request-id'
      );
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    });

    it('cleans up start time after trackQueryEnd', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      const requestId = trackingService.trackQueryStart('req-1');
      jest.setSystemTime(now + 500);
      trackingService.trackQueryEnd(requestId!);

      // Second call should warn
      trackingService.trackQueryEnd(requestId!);

      expect(logger.warn).toHaveBeenCalledWith(`No start time found for request: ${requestId}`);

      jest.useRealTimers();
    });

    it('logs error when trackQueryStart throws', () => {
      // Force an error by mocking Date.now to throw
      const originalDateNow = Date.now;
      Date.now = jest.fn().mockImplementation(() => {
        throw new Error('Date error');
      });

      const result = trackingService.trackQueryStart('req-1');

      expect(logger.error).toHaveBeenCalledWith('Failed to track query start: Date error');
      expect(result).toBeUndefined();

      Date.now = originalDateNow;
    });

    it('logs error when trackQueryEnd throws', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      const requestId = trackingService.trackQueryStart('req-1');

      mockUsageCounter.incrementCounter.mockImplementation(() => {
        throw new Error('Counter error');
      });

      jest.setSystemTime(now + 500);
      trackingService.trackQueryEnd(requestId!);

      expect(logger.error).toHaveBeenCalledWith('Failed to track query end: Counter error');

      jest.useRealTimers();
    });
  });

  describe('trackLLMUsage', () => {
    it('tracks provider and model usage', () => {
      trackingService.trackLLMUsage('openai', 'gpt-4');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(2);
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_llm_provider_openai`,
        counterType: 'count',
        incrementBy: 1,
      });
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_llm_model_gpt-4`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('uses "unknown" for undefined provider', () => {
      trackingService.trackLLMUsage(undefined, 'gpt-4');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_llm_provider_unknown`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('uses "unknown" for undefined model', () => {
      trackingService.trackLLMUsage('openai', undefined);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_llm_model_unknown`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('sanitizes provider and model names', () => {
      trackingService.trackLLMUsage('OpenAI@Cloud', 'GPT-4-Turbo!');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_llm_provider_openai_cloud`,
        counterType: 'count',
        incrementBy: 1,
      });
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_llm_model_gpt-4-turbo`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('logs debug message on success', () => {
      trackingService.trackLLMUsage('openai', 'gpt-4');

      expect(logger.debug).toHaveBeenCalledWith('Tracked LLM usage: provider=openai, model=gpt-4');
    });

    it('logs error when incrementCounter throws', () => {
      mockUsageCounter.incrementCounter.mockImplementation(() => {
        throw new Error('Counter error');
      });

      trackingService.trackLLMUsage('openai', 'gpt-4');

      expect(logger.error).toHaveBeenCalledWith('Failed to track LLM usage: Counter error');
    });
  });

  describe('trackError', () => {
    it('increments total error counter', () => {
      const error = new Error('Test error');
      trackingService.trackError(error);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_total`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('increments error by type counter for AgentBuilderError', () => {
      const error = createAgentBuilderError(AgentBuilderErrorCode.badRequest, 'Bad request');
      trackingService.trackError(error);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_by_type_badrequest`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('increments error by type counter for regular Error as "other"', () => {
      const error = new Error('Regular error');
      trackingService.trackError(error);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_by_type_other`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks agentExecutionError with errCode', () => {
      const error = createMockAgentExecutionError(AgentExecutionErrorCode.contextLengthExceeded);
      trackingService.trackError(error);

      // Note: the prefix agentExecutionError is not lowercased, only the error code part
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_by_type_agentExecutionError_context_length_exceeded`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks conversations with errors only once per conversation', () => {
      const error = new Error('Test error');

      trackingService.trackError(error, 'conv-1');
      trackingService.trackError(error, 'conv-1');
      trackingService.trackError(error, 'conv-1');

      const conversationsWithErrorsCalls = mockUsageCounter.incrementCounter.mock.calls.filter(
        (call) =>
          call[0].counterName === `${AGENTBUILDER_USAGE_DOMAIN}_error_conversations_with_errors`
      );

      expect(conversationsWithErrorsCalls).toHaveLength(1);
    });

    it('tracks different conversations with errors separately', () => {
      const error = new Error('Test error');

      trackingService.trackError(error, 'conv-1');
      trackingService.trackError(error, 'conv-2');
      trackingService.trackError(error, 'conv-3');

      const conversationsWithErrorsCalls = mockUsageCounter.incrementCounter.mock.calls.filter(
        (call) =>
          call[0].counterName === `${AGENTBUILDER_USAGE_DOMAIN}_error_conversations_with_errors`
      );

      expect(conversationsWithErrorsCalls).toHaveLength(3);
    });

    it('does not track conversations_with_errors when no conversationId provided', () => {
      const error = new Error('Test error');

      trackingService.trackError(error);

      const conversationsWithErrorsCalls = mockUsageCounter.incrementCounter.mock.calls.filter(
        (call) =>
          call[0].counterName === `${AGENTBUILDER_USAGE_DOMAIN}_error_conversations_with_errors`
      );

      expect(conversationsWithErrorsCalls).toHaveLength(0);
    });

    it('logs error when tracking fails', () => {
      mockUsageCounter.incrementCounter.mockImplementation(() => {
        throw new Error('Counter error');
      });

      trackingService.trackError(new Error('Test error'));

      expect(logger.error).toHaveBeenCalledWith('Failed to track error: Counter error');
    });

    it('handles null error', () => {
      trackingService.trackError(null);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_total`,
        counterType: 'count',
        incrementBy: 1,
      });
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_by_type_other`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('handles undefined error', () => {
      trackingService.trackError(undefined);

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_total`,
        counterType: 'count',
        incrementBy: 1,
      });
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_by_type_other`,
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('handles string error', () => {
      trackingService.trackError('string error');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_total`,
        counterType: 'count',
        incrementBy: 1,
      });
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_by_type_other`,
        counterType: 'count',
        incrementBy: 1,
      });
    });
  });
});
