/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { v4 as uuidv4 } from 'uuid';
import { AGENTBUILDER_USAGE_DOMAIN, trackLLMUsage as trackLLMUsageCounter } from './usage_counters';
import {
  normalizeErrorType,
  sanitizeForCounterName,
  getAgentExecutionErrorCode,
} from './error_utils';
/**
 * Tool call source - identifies where the tool was called from
 */
export enum ToolCallSource {
  DEFAULT_AGENT = 'default_agent',
  CUSTOM_AGENT = 'custom_agent',
  MCP = 'mcp',
  API = 'api',
  A2A = 'a2a',
}

/**
 * Tracking service for telemetry collection
 *
 * Centralized service for tracking all metrics related to Agent Builder usage:
 * - Tool calls by source
 * - Errors by type and context
 * - Conversation rounds
 * - Query-to-result times
 * - LLM provider and model usage
 * - Token consumption
 */
export class TrackingService {
  // In-memory tracking for query times (request ID → start time)
  private queryStartTimes = new Map<string, number>();
  private conversationsWithErrors = new Set<string>();

  constructor(private readonly usageCounter: UsageCounter, private readonly logger: Logger) {}

  /**
   * Track a tool call
   * @param toolId - Tool identifier
   * @param source - Where the tool was called from
   */
  trackToolCall(toolId: string, source: ToolCallSource): void {
    try {
      this.usageCounter.incrementCounter({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_tool_call_${source}`,
        counterType: 'count',
        incrementBy: 1,
      });

      this.logger.debug(`Tracked tool call: ${toolId} from ${source}`);
    } catch (error) {
      this.logger.error(`Failed to track tool call: ${error.message}`);
    }
  }

  /**
   * Track conversation round count
   * @param conversationId - Conversation identifier
   * @param roundNumber - Current round number
   */
  trackConversationRound(conversationId: string, roundNumber: number): void {
    try {
      // Determine bucket for round count
      let bucket: string;
      if (roundNumber <= 5) {
        bucket = 'rounds_1-5';
      } else if (roundNumber <= 10) {
        bucket = 'rounds_6-10';
      } else if (roundNumber <= 20) {
        bucket = 'rounds_11-20';
      } else if (roundNumber <= 50) {
        bucket = 'rounds_21-50';
      } else {
        bucket = 'rounds_51+';
      }

      this.usageCounter.incrementCounter({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_${bucket}`,
        counterType: 'count',
        incrementBy: 1,
      });

      this.logger.debug(`Tracked conversation round: ${conversationId} round ${roundNumber}`);
    } catch (error) {
      this.logger.error(`Failed to track conversation round: ${error.message}`);
    }
  }

  /**
   * Track query start time
   * @param requestId - Unique request identifier
   */
  trackQueryStart(requestId?: string): string | undefined {
    try {
      if (!requestId) {
        requestId = uuidv4();
      }
      this.queryStartTimes.set(requestId, Date.now());
      this.logger.debug(`Tracked query start: ${requestId}`);
      return requestId;
    } catch (error) {
      this.logger.error(`Failed to track query start: ${error.message}`);
    }
  }

  /**
   * Track query end time and calculate duration
   * @param requestId - Unique request identifier
   */
  trackQueryEnd(requestId: string): void {
    try {
      const startTime = this.queryStartTimes.get(requestId);
      if (!startTime) {
        this.logger.warn(`No start time found for request: ${requestId}`);
        return;
      }

      const durationMs = Date.now() - startTime;
      this.queryStartTimes.delete(requestId);

      // Determine bucket for duration
      let bucket: string;
      if (durationMs < 1000) {
        bucket = 'query_to_result_time_<1s';
      } else if (durationMs < 5000) {
        bucket = 'query_to_result_time_1-5s';
      } else if (durationMs < 10000) {
        bucket = 'query_to_result_time_5-10s';
      } else if (durationMs < 30000) {
        bucket = 'query_to_result_time_10-30s';
      } else {
        bucket = 'query_to_result_time_30s+';
      }

      this.usageCounter.incrementCounter({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_${bucket}`,
        counterType: 'count',
        incrementBy: 1,
      });

      this.logger.debug(`Tracked query end: ${requestId} duration: ${durationMs}ms`);
    } catch (error) {
      this.logger.error(`Failed to track query end: ${error.message}`);
    }
  }

  /**
   * Track LLM usage by provider and model
   * @param provider - LLM provider (e.g., 'openai', 'bedrock')
   * @param model - Model identifier
   */
  trackLLMUsage(provider: string | undefined, model: string | undefined): void {
    try {
      const normalizedProvider = provider || 'unknown';
      const normalizedModel = model || 'unknown';

      const sanitizedProvider = sanitizeForCounterName(normalizedProvider);
      const sanitizedModel = sanitizeForCounterName(normalizedModel);

      trackLLMUsageCounter(this.usageCounter, sanitizedProvider, sanitizedModel);

      this.logger.debug(
        `Tracked LLM usage: provider=${sanitizedProvider}, model=${sanitizedModel}`
      );
    } catch (error) {
      this.logger.error(`Failed to track LLM usage: ${error.message}`);
    }
  }

  /**
   * Track an error surfaced to users
   * @param error - Error object
   * @param conversationId - Optional conversation ID (used only to track unique conversations with errors, not logged/stored)
   */
  trackError(error: unknown, conversationId?: string): void {
    try {
      const errorType = normalizeErrorType(error);
      let sanitizedType = sanitizeForCounterName(errorType);

      this.usageCounter.incrementCounter({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_total`,
        counterType: 'count',
        incrementBy: 1,
      });

      const agentExecutionErrorCode = getAgentExecutionErrorCode(error);
      if (agentExecutionErrorCode) {
        sanitizedType = `agentExecutionError_${sanitizeForCounterName(agentExecutionErrorCode)}`;
      }
      this.usageCounter.incrementCounter({
        counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_by_type_${sanitizedType}`,
        counterType: 'count',
        incrementBy: 1,
      });

      if (conversationId && !this.conversationsWithErrors.has(conversationId)) {
        this.conversationsWithErrors.add(conversationId);
        this.usageCounter.incrementCounter({
          counterName: `${AGENTBUILDER_USAGE_DOMAIN}_error_conversations_with_errors`,
          counterType: 'count',
          incrementBy: 1,
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to track error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
