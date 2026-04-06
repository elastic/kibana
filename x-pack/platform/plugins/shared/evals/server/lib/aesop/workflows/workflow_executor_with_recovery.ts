/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Workflow Executor with Error Recovery
 *
 * Orchestrates AESOP workflow execution with integrated retry logic
 * and circuit breaker for agent invocations.
 *
 * Features:
 * - Retry logic for transient failures
 * - Circuit breaker for agent health tracking
 * - Partial result collection (continue on agent failure)
 * - Error summary generation
 * - Fallback strategies
 *
 * Usage:
 * ```typescript
 * const executor = new WorkflowExecutorWithRecovery(
 *   agentBuilder,
 *   esClient,
 *   logger
 * );
 *
 * const result = await executor.executeWorkflow({
 *   agents: ['agent1', 'agent2', 'agent3'],
 *   continueOnFailure: true,
 * });
 *
 * console.log(result.successfulAgents); // ['agent1', 'agent3']
 * console.log(result.failedAgents); // ['agent2']
 * console.log(result.errors); // [{ agent: 'agent2', error: '...' }]
 * ```
 */

import type { Logger } from '@kbn/core/server';
import { WorkflowRetryHandler } from './retry_handler';
import { CircuitBreaker, CircuitState } from './circuit_breaker';

export interface WorkflowExecutionOptions {
  /** List of agent IDs to execute */
  agents: string[];

  /** Continue execution even if individual agents fail (default: true) */
  continueOnFailure: boolean;

  /** Maximum retries for each agent invocation (default: 3) */
  maxRetries?: number;

  /** Circuit breaker failure threshold (default: 3) */
  failureThreshold?: number;

  /** Timeout per agent invocation in milliseconds (default: 300000 = 5min) */
  timeoutMs?: number;

  /** Context data passed to agents */
  context?: any;
}

export interface AgentResult {
  agentId: string;
  success: boolean;
  result?: any;
  error?: string;
  attempts: number;
  durationMs: number;
  skipped?: boolean;
  skipReason?: string;
}

export interface WorkflowExecutionResult {
  /** Total agents attempted */
  totalAgents: number;

  /** Number of successful agent invocations */
  successfulAgents: number;

  /** Number of failed agent invocations */
  failedAgents: number;

  /** Number of skipped agents (circuit breaker) */
  skippedAgents: number;

  /** Individual agent results */
  results: AgentResult[];

  /** Error summary */
  errorSummary: Array<{
    agentId: string;
    error: string;
    circuitState?: CircuitState;
  }>;

  /** Overall execution status */
  status: 'completed' | 'partial' | 'failed';

  /** Total execution duration */
  totalDurationMs: number;
}

/**
 * Workflow Executor with Error Recovery
 *
 * Executes multi-agent workflows with retry logic and circuit breaker.
 */
export class WorkflowExecutorWithRecovery {
  private retryHandler: WorkflowRetryHandler;
  private circuitBreaker: CircuitBreaker;

  constructor(
    private readonly agentInvoker: (agentId: string, context: any) => Promise<any>,
    private readonly logger: Logger
  ) {
    this.retryHandler = new WorkflowRetryHandler(logger);
    this.circuitBreaker = new CircuitBreaker(logger);
  }

  /**
   * Execute workflow with error recovery
   *
   * @param options - Workflow execution options
   * @returns Execution result with partial results and error summary
   */
  async executeWorkflow(options: WorkflowExecutionOptions): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();

    const results: AgentResult[] = [];
    const errorSummary: Array<{ agentId: string; error: string; circuitState?: CircuitState }> = [];

    // Apply per-workflow circuit breaker configuration if provided
    if (options.failureThreshold !== undefined) {
      this.circuitBreaker.setFailureThreshold(options.failureThreshold);
    }

    this.logger.info(
      `[WorkflowExecutor] Starting workflow execution total_agents=${options.agents.length} continue_on_failure=${options.continueOnFailure}`
    );

    // Execute each agent
    for (const agentId of options.agents) {
      const agentResult = await this.executeAgent(agentId, options);
      results.push(agentResult);

      if (!agentResult.success) {
        errorSummary.push({
          agentId,
          error: agentResult.error || 'Unknown error',
          circuitState: this.circuitBreaker.getCircuitState(agentId),
        });

        // If not continuing on failure, stop execution
        if (!options.continueOnFailure && !agentResult.skipped) {
          this.logger.error(
            `[WorkflowExecutor] Stopping execution due to agent failure failed_agent=${agentId}`
          );
          break;
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;

    const successfulAgents = results.filter((r) => r.success).length;
    const failedAgents = results.filter((r) => !r.success && !r.skipped).length;
    const skippedAgents = results.filter((r) => r.skipped).length;

    // Determine overall status
    let status: 'completed' | 'partial' | 'failed';
    if (successfulAgents === results.length) {
      status = 'completed';
    } else if (successfulAgents > 0) {
      status = 'partial';
    } else {
      status = 'failed';
    }

    this.logger.info(
      `[WorkflowExecutor] Workflow execution finished status=${status} total_agents=${results.length} successful=${successfulAgents} failed=${failedAgents} skipped=${skippedAgents} duration_ms=${totalDurationMs}`
    );

    return {
      totalAgents: results.length,
      successfulAgents,
      failedAgents,
      skippedAgents,
      results,
      errorSummary,
      status,
      totalDurationMs,
    };
  }

  /**
   * Execute single agent with retry and circuit breaker
   */
  private async executeAgent(
    agentId: string,
    options: WorkflowExecutionOptions
  ): Promise<AgentResult> {
    const agentStartTime = Date.now();

    // Check circuit breaker
    if (this.circuitBreaker.shouldSkipAgent(agentId)) {
      return {
        agentId,
        success: false,
        attempts: 0,
        durationMs: Date.now() - agentStartTime,
        skipped: true,
        skipReason: 'Circuit breaker open (agent unavailable)',
      };
    }

    let attempts = 0;
    let result: any;
    let error: string | undefined;
    let success = false;

    try {
      // Execute with retry logic
      const retryResult = await this.retryHandler.executeWithRetryMetadata(
        async () => {
          attempts++;

          // Add timeout wrapper
          const timeoutMs = options.timeoutMs || 300000; // 5 min default
          return await this.withTimeout(
            this.agentInvoker(agentId, options.context),
            timeoutMs,
            `Agent ${agentId} timeout after ${timeoutMs}ms`
          );
        },
        {
          maxRetries: options.maxRetries || 3,
          operationName: `agent_${agentId}`,
          onRetry: (attempt, err, delayMs) => {
            this.logger.warn(
              `[WorkflowExecutor] Retrying agent ${agentId} attempt=${attempt} error=${err?.message} delay_ms=${delayMs}`
            );
            // Record each failed attempt in the circuit breaker so the threshold
            // can be reached across retry attempts within a single executeWorkflow call
            this.circuitBreaker.recordFailure(agentId, err);
          },
        }
      );

      result = retryResult.result;
      attempts = retryResult.attempts;
      success = true;

      // Record success in circuit breaker
      this.circuitBreaker.recordSuccess(agentId);
    } catch (err: any) {
      error = err?.message || String(err);
      success = false;

      // Record failure in circuit breaker
      this.circuitBreaker.recordFailure(agentId, err);

      this.logger.error(
        `[WorkflowExecutor] Agent ${agentId} failed after ${attempts} attempts error=${error}`
      );
    }

    const durationMs = Date.now() - agentStartTime;

    return {
      agentId,
      success,
      result: success ? result : undefined,
      error: success ? undefined : error,
      attempts,
      durationMs,
    };
  }

  /**
   * Wrap promise with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)),
    ]);
  }

  /**
   * Get circuit breaker health status for all agents
   */
  getAgentHealthStatus(): Map<
    string,
    {
      agentId: string;
      state: CircuitState;
      healthy: boolean;
      failureRate: number;
    }
  > {
    const stats = this.circuitBreaker.getCircuitStats();
    const healthStatus = new Map();

    for (const [agentId, circuitInfo] of stats.entries()) {
      healthStatus.set(agentId, {
        agentId,
        state: circuitInfo.state,
        healthy: circuitInfo.state !== CircuitState.OPEN,
        failureRate: this.circuitBreaker.getFailureRate(agentId),
      });
    }

    return healthStatus;
  }

  /**
   * Manually reset circuit breaker for an agent
   */
  resetAgentCircuit(agentId: string): void {
    this.circuitBreaker.resetCircuit(agentId);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuits(): void {
    this.circuitBreaker.resetAll();
  }
}
