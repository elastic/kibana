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
  ConversationRoundStepType,
  oneChatDefaultAgentId,
  type ConversationRound,
} from '@kbn/onechat-common';
import {
  InferenceConnectorType,
  ModelProvider,
  type InferenceConnector,
} from '@kbn/inference-common';
import type { ChatRequestBodyPayload } from '../../common/http_api/chat';
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

  describe('reportMessageSent', () => {
    const payload: ChatRequestBodyPayload = {
      input: 'hello',
      agent_id: oneChatDefaultAgentId,
    };

    it('reports the MessageSent event', () => {
      service.reportMessageSent(payload);

      expect(analytics.reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.MessageSent, {
        conversation_id: 'new',
        message_length: payload.input.length,
        has_attachments: false,
        attachment_count: undefined,
        attachment_types: undefined,
        agent_id: oneChatDefaultAgentId,
      });
    });

    it('does not throw when reporting throws', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => service.reportMessageSent(payload)).not.toThrow();
    });

    it('logs debug when reporting throws', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      service.reportMessageSent(payload);

      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe('reportMessageReceived', () => {
    const connector: InferenceConnector = {
      type: InferenceConnectorType.OpenAI,
      name: 'connector-name',
      connectorId: 'connector-id',
      config: {},
      capabilities: {},
    };

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
      },
      trace_id: 'trace-1',
    };

    it('reports the MessageReceived event', () => {
      service.reportMessageReceived({
        agentId: oneChatDefaultAgentId,
        conversationId: 'conversation-1',
        round,
        roundCount: 2,
        connector,
      });

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        AGENT_BUILDER_EVENT_TYPES.MessageReceived,
        {
          conversation_id: 'conversation-1',
          response_length: round.response.message.length,
          round_number: 2,
          agent_id: oneChatDefaultAgentId,
          tools_invoked: ['custom'],
          trace_id: 'trace-1',
          started_at: '2025-01-01T00:00:00.000Z',
          time_to_first_token: 1,
          time_to_last_token: 2,
          model_provider: ModelProvider.OpenAI,
          llm_calls: 3,
          input_tokens: 4,
          output_tokens: 5,
        }
      );
    });

    it('does not throw when reporting throws', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() =>
        service.reportMessageReceived({
          agentId: oneChatDefaultAgentId,
          conversationId: 'conversation-1',
          round,
          roundCount: 2,
          connector,
        })
      ).not.toThrow();
    });

    it('logs debug when reporting throws', () => {
      analytics.reportEvent.mockImplementation(() => {
        throw new Error('boom');
      });

      service.reportMessageReceived({
        agentId: oneChatDefaultAgentId,
        conversationId: 'conversation-1',
        round,
        roundCount: 2,
        connector,
      });

      expect(logger.debug).toHaveBeenCalled();
    });
  });
});
