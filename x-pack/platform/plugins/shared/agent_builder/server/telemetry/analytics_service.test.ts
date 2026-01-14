/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  AGENT_BUILDER_EVENT_TYPES,
  agentBuilderServerEbtEvents,
  ConversationRoundStatus,
  ConversationRoundStepType,
  agentBuilderDefaultAgentId,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import { ModelProvider } from '@kbn/inference-common';
import { AnalyticsService } from './analytics_service';

describe('AnalyticsService', () => {
  let analytics: jest.Mocked<Pick<AnalyticsServiceSetup, 'registerEventType' | 'reportEvent'>>;
  let logger: MockedLogger;
  let service: AnalyticsService;

  beforeEach(() => {
    analytics = {
      registerEventType: jest.fn(),
      reportEvent: jest.fn(),
    };
    logger = loggerMock.create();
    service = new AnalyticsService(analytics as unknown as AnalyticsServiceSetup, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerAgentBuilderEventTypes', () => {
    beforeEach(() => {
      service.registerAgentBuilderEventTypes();
    });

    describe.each(agentBuilderServerEbtEvents)('eventType: $eventType', (eventConfig) => {
      it('registers the event type', () => {
        expect(analytics.registerEventType).toHaveBeenCalledWith(eventConfig);
      });
    });
  });

  describe('reportRoundComplete', () => {
    const modelProvider = ModelProvider.OpenAI;
    const round: ConversationRound = {
      id: 'round-1',
      input: { message: 'hi' },
      steps: [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'tool-call-1',
          tool_id: 'my_custom_tool',
          params: {},
          results: [],
        },
      ],
      response: { message: 'response' },
      started_at: '2025-01-01T00:00:00.000Z',
      time_to_first_token: 1,
      time_to_last_token: 2,
      model_usage: {
        connector_id: 'connector-id',
        llm_calls: 3,
        input_tokens: 4,
        output_tokens: 5,
        model: 'gpt-97q',
      },
      status: ConversationRoundStatus.completed,
      trace_id: 'trace-1',
    };

    it('reports the RoundComplete event', () => {
      service.reportRoundComplete({
        agentId: agentBuilderDefaultAgentId,
        conversationId: 'conversation-1',
        round,
        roundCount: 2,
        modelProvider,
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.RoundComplete, {
        agent_id: agentBuilderDefaultAgentId,
        conversation_id: 'conversation-1',
        input_tokens: 4,
        llm_calls: 3,
        message_length: 2,
        model: 'gpt-97q',
        model_provider: ModelProvider.OpenAI,
        output_tokens: 5,
        round_id: 'round-1',
        response_length: round.response.message.length,
        round_number: 2,
        started_at: '2025-01-01T00:00:00.000Z',
        time_to_first_token: 1,
        time_to_last_token: 2,
        tools_invoked: ['custom-3c9388baa67aef90'],
      });
    });

    it('reports a hashed agent_id for custom agents', () => {
      service.reportRoundComplete({
        agentId: 'my_custom_agent',
        conversationId: 'conversation-1',
        round,
        roundCount: 2,
        modelProvider,
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.RoundComplete, {
        agent_id: 'custom-da3031a511e7fadf',
        conversation_id: 'conversation-1',
        input_tokens: 4,
        llm_calls: 3,
        message_length: 2,
        model: 'gpt-97q',
        model_provider: ModelProvider.OpenAI,
        output_tokens: 5,
        round_id: 'round-1',
        response_length: round.response.message.length,
        round_number: 2,
        started_at: '2025-01-01T00:00:00.000Z',
        time_to_first_token: 1,
        time_to_last_token: 2,
        tools_invoked: ['custom-3c9388baa67aef90'],
      });
    });

    it('does not throw when reporting throws', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() =>
        service.reportRoundComplete({
          agentId: agentBuilderDefaultAgentId,
          conversationId: 'conversation-1',
          round,
          roundCount: 2,
          modelProvider,
        })
      ).not.toThrow();
    });

    it('logs debug when reporting throws', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      service.reportRoundComplete({
        agentId: agentBuilderDefaultAgentId,
        conversationId: 'conversation-1',
        round,
        roundCount: 2,
        modelProvider,
      });

      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe('reportAgentCreated', () => {
    it('reports the AgentCreated event', () => {
      service.reportAgentCreated({
        agentId: agentBuilderDefaultAgentId,
        toolSelection: [
          {
            tool_ids: ['my_custom_tool', 'my_custom_tool'],
          },
        ],
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.AgentCreated, {
        agent_id: agentBuilderDefaultAgentId,
        tool_ids: ['custom-3c9388baa67aef90'],
      });
    });

    it('reports a hashed agent_id for custom agents', () => {
      service.reportAgentCreated({
        agentId: 'my_custom_agent',
        toolSelection: [
          {
            tool_ids: [],
          },
        ],
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.AgentCreated, {
        agent_id: 'custom-da3031a511e7fadf',
        tool_ids: [],
      });
    });
  });

  describe('reportAgentUpdated', () => {
    it('reports the AgentUpdated event', () => {
      service.reportAgentUpdated({
        agentId: agentBuilderDefaultAgentId,
        toolSelection: [
          {
            tool_ids: ['my_custom_tool', 'my_custom_tool'],
          },
        ],
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.AgentUpdated, {
        agent_id: agentBuilderDefaultAgentId,
        tool_ids: ['custom-3c9388baa67aef90'],
      });
    });
  });

  describe('reportToolCreated', () => {
    it('reports the ToolCreated event', () => {
      service.reportToolCreated({ toolId: 'my_custom_tool', toolType: 'esql' });

      expect(analytics.reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.ToolCreated, {
        tool_id: 'custom-3c9388baa67aef90',
        tool_type: 'esql',
      });
    });
  });

  describe('reportRoundError', () => {
    const defaultArgs = {
      agentId: agentBuilderDefaultAgentId,
      conversationId: 'conversation-1',
      error: new Error('boom'),
      modelProvider: ModelProvider.OpenAI,
    };

    it('reports the RoundError event with a truncated error_message', () => {
      const longMessage = 'a'.repeat(2000);

      service.reportRoundError({
        ...defaultArgs,
        error: new Error(longMessage),
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        AGENT_BUILDER_EVENT_TYPES.RoundError,
        expect.objectContaining({
          error_message: `${'a'.repeat(500)}`,
        })
      );
    });
  });
});
