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
  type ToolSelection,
  type ToolType,
} from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/inference-common';
import { normalizeErrorType, sanitizeForCounterName } from './error_utils';
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

  reportAgentCreated({
    agentId,
    toolSelection,
  }: {
    agentId: string;
    toolSelection: ToolSelection[];
  }): void {
    try {
      const normalizedAgentId = normalizeAgentIdForTelemetry(agentId);
      const toolIds = toolSelection.flatMap((selection) => selection.tool_ids);
      const toolsIncluded = Array.from(new Set(toolIds)).map((toolId) =>
        normalizeToolIdForTelemetry(toolId)
      );
      this.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.AgentCreated, {
        agent_id: normalizedAgentId,
        tool_ids: toolsIncluded,
      });
    } catch (error) {
      // Do not fail the request if telemetry fails
      this.logger.debug('Failed to report AgentCreated telemetry event', { error });
    }
  }

  reportAgentUpdated({
    agentId,
    toolSelection,
  }: {
    agentId: string;
    toolSelection: ToolSelection[];
  }): void {
    try {
      const normalizedAgentId = normalizeAgentIdForTelemetry(agentId);
      const toolIds = toolSelection.flatMap((selection) => selection.tool_ids);
      const toolsIncluded = Array.from(new Set(toolIds)).map((toolId) =>
        normalizeToolIdForTelemetry(toolId)
      );
      this.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.AgentUpdated, {
        agent_id: normalizedAgentId,
        tool_ids: toolsIncluded,
      });
    } catch (error) {
      // Do not fail the request if telemetry fails
      this.logger.debug('Failed to report AgentUpdated telemetry event', { error });
    }
  }

  reportToolCreated({ toolId, toolType }: { toolId: string; toolType: ToolType | string }): void {
    try {
      this.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.ToolCreated, {
        tool_id: normalizeToolIdForTelemetry(toolId),
        tool_type: toolType,
      });
    } catch (error) {
      // Do not fail the request if telemetry fails
      this.logger.debug('Failed to report ToolCreated telemetry event', { error });
    }
  }

  reportRoundComplete({
    agentId,
    conversationId,
    modelProvider,
    round,
    roundCount,
  }: {
    agentId: string;
    conversationId?: string;
    modelProvider: ModelProvider;
    round: ConversationRound;
    roundCount: number;
  }): void {
    try {
      const normalizedAgentId = normalizeAgentIdForTelemetry(agentId);
      // NOTE: `tools_invoked` is intentionally an array that can include duplicates (one per tool
      // call). This allows downstream telemetry analysis to compute per-tool invocation counts by
      // aggregating over the array values.
      const toolsInvoked =
        round.steps
          ?.filter((step) => step.type === ConversationRoundStepType.toolCall)
          .map((step) => normalizeToolIdForTelemetry(step.tool_id)) ?? [];
      const attachments = round.input.attachments?.length
        ? round.input.attachments.map((a) => a.type || 'unknown')
        : undefined;
      this.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.RoundComplete, {
        agent_id: normalizedAgentId,
        attachments,
        conversation_id: conversationId,
        input_tokens: round.model_usage.input_tokens,
        llm_calls: round.model_usage.llm_calls,
        message_length: round.input.message.length,
        model: round.model_usage.model,
        model_provider: modelProvider,
        output_tokens: round.model_usage.output_tokens,
        round_id: round.id,
        response_length: round.response.message.length,
        round_number: roundCount,
        started_at: round.started_at,
        time_to_first_token: round.time_to_first_token,
        time_to_last_token: round.time_to_last_token,
        tools_invoked: toolsInvoked,
      });
    } catch (error) {
      // Do not fail the request if telemetry fails
      this.logger.debug('Failed to report RoundComplete telemetry event', { error });
    }
  }

  reportRoundError({
    agentId,
    conversationId,
    error,
    modelProvider,
    roundId,
  }: {
    agentId: string;
    conversationId?: string;
    error: unknown;
    modelProvider: ModelProvider;
    roundId?: string;
  }): void {
    try {
      const normalizedAgentId = normalizeAgentIdForTelemetry(agentId);
      const errorType = sanitizeForCounterName(normalizeErrorType(error));
      const errorMessage = (error instanceof Error ? error.message : String(error)).slice(0, 500);
      this.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.RoundError, {
        agent_id: normalizedAgentId,
        conversation_id: conversationId,
        model_provider: modelProvider,
        error_message: errorMessage,
        error_type: errorType,
        ...(roundId ? { round_id: roundId } : {}),
      });
    } catch (err) {
      // Do not fail the request if telemetry fails
      this.logger.debug('Failed to report RoundError telemetry event', { error: err });
    }
  }
}
