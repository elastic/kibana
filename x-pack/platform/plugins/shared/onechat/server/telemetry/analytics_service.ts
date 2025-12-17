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
      console.log('round ==>', JSON.stringify(round, null, 2));
      const normalizedAgentId = normalizeAgentIdForTelemetry(agentId);
      // NOTE: `tools_invoked` is intentionally an array that can include duplicates (one per tool
      // call). This allows downstream telemetry analysis to compute per-tool invocation counts by
      // aggregating over the array values.
      const toolsInvoked =
        round.steps
          ?.filter((step) => step.type === ConversationRoundStepType.toolCall)
          .map((step) => normalizeToolIdForTelemetry(step.tool_id)) ?? [];

      this.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.RoundComplete, {
        conversation_id: conversationId,
        response_length: round.response?.message?.length,
        round_number: roundCount,
        agent_id: normalizedAgentId,
        tools_invoked: toolsInvoked,
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
