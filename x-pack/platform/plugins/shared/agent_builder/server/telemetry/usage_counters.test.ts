/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
import {
  createAgentBuilderUsageCounter,
  trackToolCall,
  trackLLMUsage,
  trackConversationRound,
  trackQueryToResultTime,
  AGENTBUILDER_USAGE_DOMAIN,
} from './usage_counters';

describe('usage_counters', () => {
  describe('AGENTBUILDER_USAGE_DOMAIN', () => {
    it('has the correct value', () => {
      expect(AGENTBUILDER_USAGE_DOMAIN).toBe('agent_builder');
    });
  });

  describe('createAgentBuilderUsageCounter', () => {
    it('returns undefined when usageCollection is undefined', () => {
      const result = createAgentBuilderUsageCounter(undefined);
      expect(result).toBeUndefined();
    });

    it('creates a usage counter when usageCollection is provided', () => {
      const mockUsageCounter = { incrementCounter: jest.fn() } as unknown as UsageCounter;
      const mockUsageCollection = {
        createUsageCounter: jest.fn().mockReturnValue(mockUsageCounter),
      } as unknown as UsageCollectionSetup;

      const result = createAgentBuilderUsageCounter(mockUsageCollection);

      expect(mockUsageCollection.createUsageCounter).toHaveBeenCalledWith(
        AGENTBUILDER_USAGE_DOMAIN
      );
      expect(result).toBe(mockUsageCounter);
    });
  });

  describe('trackToolCall', () => {
    let mockUsageCounter: jest.Mocked<UsageCounter>;

    beforeEach(() => {
      mockUsageCounter = {
        incrementCounter: jest.fn(),
      } as unknown as jest.Mocked<UsageCounter>;
    });

    it('does nothing when usageCounter is undefined', () => {
      expect(() => trackToolCall(undefined, 'default_agent')).not.toThrow();
    });

    it('tracks tool call from default_agent', () => {
      trackToolCall(mockUsageCounter, 'default_agent');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'agent_builder_tool_call_default_agent',
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks tool call from custom_agent', () => {
      trackToolCall(mockUsageCounter, 'custom_agent');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'agent_builder_tool_call_custom_agent',
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks tool call from mcp', () => {
      trackToolCall(mockUsageCounter, 'mcp');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'agent_builder_tool_call_mcp',
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks tool call from api', () => {
      trackToolCall(mockUsageCounter, 'api');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'agent_builder_tool_call_api',
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('tracks tool call from a2a', () => {
      trackToolCall(mockUsageCounter, 'a2a');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'agent_builder_tool_call_a2a',
        counterType: 'count',
        incrementBy: 1,
      });
    });
  });

  describe('trackLLMUsage', () => {
    let mockUsageCounter: jest.Mocked<UsageCounter>;

    beforeEach(() => {
      mockUsageCounter = {
        incrementCounter: jest.fn(),
      } as unknown as jest.Mocked<UsageCounter>;
    });

    it('does nothing when usageCounter is undefined', () => {
      expect(() => trackLLMUsage(undefined, 'openai', 'gpt-4')).not.toThrow();
    });

    it('tracks LLM provider and model usage', () => {
      trackLLMUsage(mockUsageCounter, 'openai', 'gpt-4');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(2);
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'agent_builder_llm_provider_openai',
        counterType: 'count',
        incrementBy: 1,
      });
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'agent_builder_llm_model_gpt-4',
        counterType: 'count',
        incrementBy: 1,
      });
    });

    it('handles different provider/model combinations', () => {
      trackLLMUsage(mockUsageCounter, 'bedrock', 'claude-3');

      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'agent_builder_llm_provider_bedrock',
        counterType: 'count',
        incrementBy: 1,
      });
      expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: 'agent_builder_llm_model_claude-3',
        counterType: 'count',
        incrementBy: 1,
      });
    });
  });

  describe('trackConversationRound', () => {
    let mockUsageCounter: jest.Mocked<UsageCounter>;

    beforeEach(() => {
      mockUsageCounter = {
        incrementCounter: jest.fn(),
      } as unknown as jest.Mocked<UsageCounter>;
    });

    it('does nothing when usageCounter is undefined', () => {
      expect(() => trackConversationRound(undefined, 1)).not.toThrow();
    });

    it('tracks rounds 1-5 in correct bucket', () => {
      for (let round = 1; round <= 5; round++) {
        mockUsageCounter.incrementCounter.mockClear();
        trackConversationRound(mockUsageCounter, round);

        expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: 'agent_builder_rounds_1-5',
          counterType: 'count',
          incrementBy: 1,
        });
      }
    });

    it('tracks rounds 6-10 in correct bucket', () => {
      for (let round = 6; round <= 10; round++) {
        mockUsageCounter.incrementCounter.mockClear();
        trackConversationRound(mockUsageCounter, round);

        expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: 'agent_builder_rounds_6-10',
          counterType: 'count',
          incrementBy: 1,
        });
      }
    });

    it('tracks rounds 11-20 in correct bucket', () => {
      for (const round of [11, 15, 20]) {
        mockUsageCounter.incrementCounter.mockClear();
        trackConversationRound(mockUsageCounter, round);

        expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: 'agent_builder_rounds_11-20',
          counterType: 'count',
          incrementBy: 1,
        });
      }
    });

    it('tracks rounds 21-50 in correct bucket', () => {
      for (const round of [21, 35, 50]) {
        mockUsageCounter.incrementCounter.mockClear();
        trackConversationRound(mockUsageCounter, round);

        expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: 'agent_builder_rounds_21-50',
          counterType: 'count',
          incrementBy: 1,
        });
      }
    });

    it('tracks rounds 51+ in correct bucket', () => {
      for (const round of [51, 75, 100]) {
        mockUsageCounter.incrementCounter.mockClear();
        trackConversationRound(mockUsageCounter, round);

        expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: 'agent_builder_rounds_51+',
          counterType: 'count',
          incrementBy: 1,
        });
      }
    });
  });

  describe('trackQueryToResultTime', () => {
    let mockUsageCounter: jest.Mocked<UsageCounter>;

    beforeEach(() => {
      mockUsageCounter = {
        incrementCounter: jest.fn(),
      } as unknown as jest.Mocked<UsageCounter>;
    });

    it('does nothing when usageCounter is undefined', () => {
      expect(() => trackQueryToResultTime(undefined, 500)).not.toThrow();
    });

    it('tracks <1s durations in correct bucket', () => {
      for (const duration of [0, 100, 500, 999]) {
        mockUsageCounter.incrementCounter.mockClear();
        trackQueryToResultTime(mockUsageCounter, duration);

        expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: 'agent_builder_query_to_result_time_<1s',
          counterType: 'count',
          incrementBy: 1,
        });
      }
    });

    it('tracks 1-5s durations in correct bucket', () => {
      for (const duration of [1000, 2500, 4999]) {
        mockUsageCounter.incrementCounter.mockClear();
        trackQueryToResultTime(mockUsageCounter, duration);

        expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: 'agent_builder_query_to_result_time_1-5s',
          counterType: 'count',
          incrementBy: 1,
        });
      }
    });

    it('tracks 5-10s durations in correct bucket', () => {
      for (const duration of [5000, 7500, 9999]) {
        mockUsageCounter.incrementCounter.mockClear();
        trackQueryToResultTime(mockUsageCounter, duration);

        expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: 'agent_builder_query_to_result_time_5-10s',
          counterType: 'count',
          incrementBy: 1,
        });
      }
    });

    it('tracks 10-30s durations in correct bucket', () => {
      for (const duration of [10000, 20000, 29999]) {
        mockUsageCounter.incrementCounter.mockClear();
        trackQueryToResultTime(mockUsageCounter, duration);

        expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: 'agent_builder_query_to_result_time_10-30s',
          counterType: 'count',
          incrementBy: 1,
        });
      }
    });

    it('tracks 30s+ durations in correct bucket', () => {
      for (const duration of [30000, 60000, 120000]) {
        mockUsageCounter.incrementCounter.mockClear();
        trackQueryToResultTime(mockUsageCounter, duration);

        expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
          counterName: 'agent_builder_query_to_result_time_30s+',
          counterType: 'count',
          incrementBy: 1,
        });
      }
    });
  });
});
