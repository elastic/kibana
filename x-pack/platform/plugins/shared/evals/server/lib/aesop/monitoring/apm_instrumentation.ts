/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP APM Instrumentation Service
 *
 * Provides custom APM instrumentation for autonomous skill discovery workflows.
 * Tracks:
 * - Workflow step execution times and outcomes
 * - Agent invocations with token usage
 * - Skill validation performance
 * - Failure modes and error patterns
 *
 * All metrics are sent to a custom Elasticsearch index for analysis.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';

interface CustomSpan {
  span_id: string;
  name: string;
  type: string;
  duration_ms: number;
  outcome: 'success' | 'failure';
  error?: string;
  metadata?: Record<string, unknown>;
  '@timestamp': string;
}

interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cached_tokens?: number;
}

interface AgentInvocationMetadata {
  agent_id: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cached_tokens?: number;
  cache_hit_rate?: number;
  model?: string;
}

export class APMInstrumentationService {
  private readonly metricsIndex = 'aesop_metrics';

  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  /**
   * Instrument workflow execution with custom APM spans
   *
   * Wraps a workflow step operation and tracks:
   * - Execution duration
   * - Success/failure outcome
   * - Custom metadata about the step
   *
   * @param stepName - Name of the workflow step (e.g., 'schema_discovery')
   * @param metadata - Additional context about the step
   * @param operation - The async operation to instrument
   * @returns The result of the operation
   */
  async instrumentWorkflowStep<T>(
    stepName: string,
    metadata: Record<string, unknown>,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const spanId = this.generateSpanId();

    this.logger.debug(`[AESOP APM] Starting workflow step: ${stepName} span_id=${spanId}`);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      // Send custom metric to APM
      await this.recordSpan({
        span_id: spanId,
        name: `workflow.step.${stepName}`,
        type: 'workflow_execution',
        duration_ms: duration,
        outcome: 'success',
        metadata,
        '@timestamp': new Date().toISOString(),
      });

      this.logger.info(
        `[AESOP APM] ✅ Workflow step completed: ${stepName} duration_ms=${duration} span_id=${spanId}`
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.recordSpan({
        span_id: spanId,
        name: `workflow.step.${stepName}`,
        type: 'workflow_execution',
        duration_ms: duration,
        outcome: 'failure',
        error: errorMessage,
        metadata,
        '@timestamp': new Date().toISOString(),
      });

      this.logger.error(
        `[AESOP APM] ❌ Workflow step failed: ${stepName} duration_ms=${duration} span_id=${spanId} error=${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Instrument agent invocation with token tracking
   *
   * Wraps an agent call and tracks:
   * - Execution duration
   * - Token usage (prompt, completion, cached)
   * - Cache hit rate
   * - Model used
   *
   * @param agentId - Identifier for the agent (e.g., 'aesop.schema_categorizer')
   * @param operation - The async operation that invokes the agent
   * @returns The result of the agent invocation
   */
  async instrumentAgentCall<T>(agentId: string, operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    const spanId = this.generateSpanId();

    this.logger.debug(`[AESOP APM] Invoking agent: ${agentId} span_id=${spanId}`);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      // Extract token usage from result if available
      const tokens = this.extractTokenUsage(result);
      const metadata: AgentInvocationMetadata = {
        agent_id: agentId,
        ...tokens,
      };

      // Calculate cache hit rate if cached tokens available
      if (tokens.cached_tokens !== undefined && tokens.prompt_tokens !== undefined) {
        metadata.cache_hit_rate =
          tokens.prompt_tokens > 0 ? (tokens.cached_tokens / tokens.prompt_tokens) * 100 : 0;
      }

      await this.recordSpan({
        span_id: spanId,
        name: `agent.invoke.${agentId}`,
        type: 'agent_execution',
        duration_ms: duration,
        outcome: 'success',
        metadata: { ...metadata } as Record<string, unknown>,
        '@timestamp': new Date().toISOString(),
      });

      this.logger.info(
        `[AESOP APM] ✅ Agent invocation completed: ${agentId} duration_ms=${duration} span_id=${spanId} total_tokens=${tokens.total_tokens} cached_tokens=${tokens.cached_tokens}`
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.recordSpan({
        span_id: spanId,
        name: `agent.invoke.${agentId}`,
        type: 'agent_execution',
        duration_ms: duration,
        outcome: 'failure',
        error: errorMessage,
        metadata: { agent_id: agentId },
        '@timestamp': new Date().toISOString(),
      });

      this.logger.error(
        `[AESOP APM] ❌ Agent invocation failed: ${agentId} duration_ms=${duration} span_id=${spanId} error=${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * Instrument skill validation operations
   *
   * Tracks validation step performance and outcomes.
   *
   * @param skillId - Identifier for the skill being validated
   * @param validationType - Type of validation (e.g., 'syntax', 'security', 'quality')
   * @param operation - The validation operation
   * @returns The result of the validation
   */
  async instrumentSkillValidation<T>(
    skillId: string,
    validationType: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const spanId = this.generateSpanId();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      await this.recordSpan({
        span_id: spanId,
        name: `skill.validation.${validationType}`,
        type: 'skill_validation',
        duration_ms: duration,
        outcome: 'success',
        metadata: {
          skill_id: skillId,
          validation_type: validationType,
        },
        '@timestamp': new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.recordSpan({
        span_id: spanId,
        name: `skill.validation.${validationType}`,
        type: 'skill_validation',
        duration_ms: duration,
        outcome: 'failure',
        error: errorMessage,
        metadata: {
          skill_id: skillId,
          validation_type: validationType,
        },
        '@timestamp': new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Record a custom span to Elasticsearch
   *
   * @param span - The span data to record
   */
  private async recordSpan(span: CustomSpan): Promise<void> {
    try {
      await this.esClient.index({
        index: this.metricsIndex,
        document: span,
      });
    } catch (error) {
      // Don't fail the operation if metrics recording fails
      this.logger.error(
        `[AESOP APM] Failed to record span span_name=${span.name} error=${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Generate a unique span ID
   */
  private generateSpanId(): string {
    return uuidv4();
  }

  /**
   * Extract token usage from agent invocation result
   *
   * Handles different response formats from various agent frameworks.
   */
  private extractTokenUsage(result: unknown): TokenUsage {
    const tokens: TokenUsage = {};

    // Handle common LLM response formats
    if (
      result &&
      typeof result === 'object' &&
      'usage' in result &&
      result.usage &&
      typeof result.usage === 'object'
    ) {
      const usage = result.usage as Record<string, unknown>;

      if (typeof usage.prompt_tokens === 'number') {
        tokens.prompt_tokens = usage.prompt_tokens;
      }
      if (typeof usage.completion_tokens === 'number') {
        tokens.completion_tokens = usage.completion_tokens;
      }
      if (typeof usage.total_tokens === 'number') {
        tokens.total_tokens = usage.total_tokens;
      }
      if (typeof usage.cached_tokens === 'number') {
        tokens.cached_tokens = usage.cached_tokens;
      }
    }

    // Calculate total if not provided
    if (
      tokens.total_tokens === undefined &&
      tokens.prompt_tokens !== undefined &&
      tokens.completion_tokens !== undefined
    ) {
      tokens.total_tokens = tokens.prompt_tokens + tokens.completion_tokens;
    }

    return tokens;
  }

  /**
   * Create the metrics index if it doesn't exist
   *
   * Should be called during plugin initialization.
   */
  async ensureMetricsIndex(): Promise<void> {
    try {
      const indexExists = await this.esClient.indices.exists({
        index: this.metricsIndex,
      });

      if (!indexExists) {
        await this.esClient.indices.create({
          index: this.metricsIndex,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
          },
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              span_id: { type: 'keyword' },
              name: { type: 'keyword' },
              type: { type: 'keyword' },
              duration_ms: { type: 'long' },
              outcome: { type: 'keyword' },
              error: { type: 'text' },
              metadata: {
                type: 'object',
                dynamic: true,
              },
            },
          },
        });

        this.logger.info(`[AESOP APM] ✅ Metrics index created index=${this.metricsIndex}`);
      }
    } catch (error) {
      this.logger.error(
        `[AESOP APM] Failed to create metrics index error=${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
