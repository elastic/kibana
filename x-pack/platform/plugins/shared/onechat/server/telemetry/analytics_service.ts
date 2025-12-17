/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  AGENT_BUILDER_EVENT_TYPES,
  agentBuilderServerEbtEvents,
  type ConversationRound,
  ConversationRoundStepType,
} from '@kbn/onechat-common';
import type { InferenceConnector } from '@kbn/inference-common';
import { getConnectorProvider } from '@kbn/inference-common';
import type { ChatRequestBodyPayload } from '../../common/http_api/chat';
import { normalizeAgentIdForTelemetry, normalizeToolIdForTelemetry } from './utils';

/**
 * Server-side analytics wrapper for Agent Builder telemetry.
 *
 * This service centralizes event type registration and reporting for
 * `AGENT_BUILDER_EVENT_TYPES` so call sites can be kept small, typed, and safe.
 */
export class AnalyticsService {
  constructor(private readonly analytics: AnalyticsServiceSetup, private readonly logger: Logger) {}

  /**
   * Register Agent Builder server event types with core analytics.
   */
  registerAgentBuilderEventTypes(): void {
    agentBuilderServerEbtEvents.forEach((eventConfig) => {
      this.analytics.registerEventType(eventConfig);
    });
  }

  reportMessageSent(payload: ChatRequestBodyPayload): void {
    try {
      const attachments = payload.attachments ?? [];
      const normalizedAgentId = normalizeAgentIdForTelemetry(payload.agent_id);
      this.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.MessageSent, {
        conversation_id: payload.conversation_id || 'new',
        message_length: payload.input?.length,
        has_attachments: attachments.length > 0,
        attachment_count: attachments.length > 0 ? attachments.length : undefined,
        attachment_types:
          attachments.length > 0 ? attachments.map((a) => a.type || 'unknown') : undefined,
        agent_id: normalizedAgentId,
      });
    } catch (error) {
      // Do not fail the request if telemetry fails
      this.logger.debug('Failed to report MessageSent telemetry event', { error });
    }
  }

  reportMessageReceived({
    round,
    connector,
    conversationId,
    roundCount,
    agentId,
  }: {
    round: ConversationRound;
    roundCount: number;
    connector: InferenceConnector;
    agentId: string;
    conversationId?: string;
  }): void {
    try {
      const normalizedAgentId = normalizeAgentIdForTelemetry(agentId);
      const toolsInvoked =
        round.steps
          ?.filter((step) => step.type === ConversationRoundStepType.toolCall)
          .map((step) => normalizeToolIdForTelemetry(step.tool_id)) ?? [];

      this.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.MessageReceived, {
        conversation_id: conversationId,
        response_length: round.response?.message?.length,
        round_number: roundCount,
        agent_id: normalizedAgentId,
        tools_invoked: toolsInvoked,
        trace_id: round.trace_id,
        started_at: round.started_at,
        time_to_first_token: round.time_to_first_token,
        time_to_last_token: round.time_to_last_token,
        model_provider: getConnectorProvider(connector),
        llm_calls: round.model_usage?.llm_calls,
        input_tokens: round.model_usage?.input_tokens,
        output_tokens: round.model_usage?.output_tokens,
      });
    } catch (error) {
      // Do not fail the request if telemetry fails
      this.logger.debug('Failed to report MessageReceived telemetry event', { error });
    }
  }
}
