/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Circuit Breaker for Workflow Execution
 *
 * Implements circuit breaker pattern to prevent cascading failures.
 * Tracks failure rates for agents and automatically "opens" circuit
 * when threshold is exceeded, preventing further calls.
 *
 * States:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Threshold exceeded, requests are rejected
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 *
 * Features:
 * - Per-agent failure tracking
 * - Configurable failure threshold
 * - Automatic circuit reset after timeout
 * - Half-open state for gradual recovery
 * - Failure rate windowing
 *
 * Usage:
 * ```typescript
 * const circuitBreaker = new CircuitBreaker(logger, {
 *   failureThreshold: 3,
 *   resetTimeoutMs: 60000,
 * });
 *
 * // Before invoking agent
 * if (circuitBreaker.shouldSkipAgent(agentId)) {
 *   logger.warn(`Circuit open for ${agentId}, skipping`);
 *   return null; // Skip this agent
 * }
 *
 * try {
 *   const result = await invokeAgent(agentId);
 *   circuitBreaker.recordSuccess(agentId);
 *   return result;
 * } catch (error) {
 *   circuitBreaker.recordFailure(agentId, error);
 *   throw error;
 * }
 * ```
 */

import type { Logger } from '@kbn/core/server';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening circuit (default: 3) */
  failureThreshold: number;

  /** Time in milliseconds before attempting to close circuit (default: 60000) */
  resetTimeoutMs: number;

  /** Number of successful requests in HALF_OPEN state before closing circuit (default: 2) */
  successThreshold: number;

  /** Time window in milliseconds for counting failures (default: 300000 = 5min) */
  failureWindowMs: number;
}

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 3,
  resetTimeoutMs: 60000, // 1 minute
  successThreshold: 2,
  failureWindowMs: 300000, // 5 minutes
};

interface CircuitInfo {
  agentId: string;
  state: CircuitState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  openedAt?: number;
  failureHistory: Array<{ timestamp: number; error: string }>;
}

export interface ExecutionSummary {
  totalExecutions: number;
  successes: number;
  failures: number;
  circuitBreakerTrips: number;
}

/**
 * Options for the high-level execute() API
 */
export interface CircuitBreakerConstructorOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitorInterval?: number;
  logger: Pick<Logger, 'info' | 'warn' | 'error' | 'debug'>;
}

/**
 * Circuit Breaker
 *
 * Prevents cascading failures by tracking agent failure rates
 * and temporarily disabling agents that exceed thresholds.
 *
 * Supports two constructor forms:
 *  - Low-level: `new CircuitBreaker(logger, options)` — use shouldSkipAgent/recordSuccess/recordFailure
 *  - High-level: `new CircuitBreaker({ failureThreshold, resetTimeout, logger })` — use execute()
 */
export class CircuitBreaker {
  private circuits: Map<string, CircuitInfo> = new Map();
  private options: CircuitBreakerOptions;
  private readonly logger: Pick<Logger, 'info' | 'warn' | 'error' | 'debug'>;

  // High-level API tracking (populated when using execute())
  private executionSummary: ExecutionSummary = {
    totalExecutions: 0,
    successes: 0,
    failures: 0,
    circuitBreakerTrips: 0,
  };
  private monitorIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    loggerOrConfig:
      | Pick<Logger, 'info' | 'warn' | 'error' | 'debug'>
      | CircuitBreakerConstructorOptions,
    options: Partial<CircuitBreakerOptions> = {}
  ) {
    if (
      loggerOrConfig !== null &&
      typeof loggerOrConfig === 'object' &&
      'logger' in loggerOrConfig
    ) {
      // Config-object form: { failureThreshold, resetTimeout, monitorInterval, logger }
      const config = loggerOrConfig as CircuitBreakerConstructorOptions;
      this.logger = config.logger;
      this.options = {
        failureThreshold: config.failureThreshold,
        resetTimeoutMs: config.resetTimeout,
        // High-level execute() API: single success in HALF_OPEN closes the circuit
        successThreshold: 1,
        failureWindowMs: DEFAULT_CIRCUIT_BREAKER_OPTIONS.failureWindowMs,
      };
      if (config.monitorInterval) {
        this.monitorIntervalId = setInterval(() => {
          // Periodic state check — no-op but keeps interval reference for shutdown
        }, config.monitorInterval);
      }
    } else {
      // Logger-first form: new CircuitBreaker(logger, options?)
      this.logger = loggerOrConfig as Pick<Logger, 'info' | 'warn' | 'error' | 'debug'>;
      this.options = {
        ...DEFAULT_CIRCUIT_BREAKER_OPTIONS,
        ...options,
      };
    }
  }

  /**
   * High-level execute API: runs fn() through circuit breaker logic.
   * Automatically tracks failures and successes. Per-agent circuit state.
   *
   * @param agentName - Identifies which circuit to use
   * @param fn - Async function to execute
   * @returns Result of fn()
   * @throws CircuitOpenError when circuit is OPEN, or rethrows fn() errors
   */
  async execute<T>(agentName: string, fn: () => Promise<T>): Promise<T> {
    const circuit = this.getOrCreateCircuit(agentName);
    this.updateCircuitState(circuit);

    if (circuit.state === CircuitState.OPEN) {
      this.logger.warn(
        `[CircuitBreaker] Circuit breaker rejected execution for agent: ${agentName}`,
        {
          agent: { name: agentName },
          state: circuit.state,
        }
      );
      const err = new Error('Circuit breaker is OPEN');
      (err as any).circuitOpen = true;
      throw err;
    }

    this.executionSummary.totalExecutions++;

    try {
      const result = await fn();
      this.recordSuccess(agentName);
      this.executionSummary.successes++;
      return result;
    } catch (error: any) {
      this.logger.debug(`[CircuitBreaker] Agent execution failed: ${agentName}`, {
        agent: { name: agentName },
        error: error?.message,
      });
      this.recordFailure(agentName, error);
      this.executionSummary.failures++;
      throw error;
    }
  }

  /**
   * Returns the overall circuit state (CLOSED/OPEN/HALF_OPEN).
   * When called with no arguments, returns the global worst-case state.
   * When called with an agentName, returns that agent's state.
   */
  getState(agentName?: string): CircuitState {
    if (agentName !== undefined) {
      return this.getCircuitState(agentName);
    }
    // Return global worst-case state across all circuits
    let worstState = CircuitState.CLOSED;
    for (const circuit of this.circuits.values()) {
      this.updateCircuitState(circuit);
      if (circuit.state === CircuitState.OPEN) return CircuitState.OPEN;
      if (circuit.state === CircuitState.HALF_OPEN) worstState = CircuitState.HALF_OPEN;
    }
    return worstState;
  }

  /**
   * Returns summary of all executions since last shutdown
   */
  getExecutionSummary(): ExecutionSummary {
    return { ...this.executionSummary };
  }

  /**
   * Shuts down the circuit breaker, clearing all state and intervals
   */
  shutdown(): void {
    if (this.monitorIntervalId !== undefined) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = undefined;
    }
    this.circuits.clear();
    this.executionSummary = {
      totalExecutions: 0,
      successes: 0,
      failures: 0,
      circuitBreakerTrips: 0,
    };
  }

  /**
   * Check if agent should be skipped due to circuit being open
   *
   * @param agentId - Agent identifier
   * @returns True if agent should be skipped
   */
  shouldSkipAgent(agentId: string): boolean {
    const circuit = this.getOrCreateCircuit(agentId);

    // Update circuit state based on timeout
    this.updateCircuitState(circuit);

    if (circuit.state === CircuitState.OPEN) {
      this.logger.warn(
        `[CircuitBreaker] Circuit OPEN for agent: ${agentId}, skipping invocation consecutive_failures=${
          circuit.consecutiveFailures
        } opened_at=${circuit.openedAt ? new Date(circuit.openedAt).toISOString() : undefined}`
      );
      return true;
    }

    return false;
  }

  /**
   * Record successful agent invocation
   *
   * @param agentId - Agent identifier
   */
  recordSuccess(agentId: string): void {
    const circuit = this.getOrCreateCircuit(agentId);
    const now = Date.now();

    circuit.lastSuccessTime = now;
    circuit.consecutiveFailures = 0; // Reset failure count
    circuit.consecutiveSuccesses++;

    // If in HALF_OPEN state, check if we can close the circuit
    if (circuit.state === CircuitState.HALF_OPEN) {
      if (circuit.consecutiveSuccesses >= this.options.successThreshold) {
        this.closeCircuit(circuit);
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      // Normal operation, success recorded
      this.logger.debug(`[CircuitBreaker] Success recorded for agent: ${agentId}`);
    }

    // Clean old failures from history
    this.cleanFailureHistory(circuit);
  }

  /**
   * Record failed agent invocation
   *
   * @param agentId - Agent identifier
   * @param error - Error that occurred
   */
  recordFailure(agentId: string, error: any): void {
    const circuit = this.getOrCreateCircuit(agentId);
    const now = Date.now();

    circuit.lastFailureTime = now;
    circuit.consecutiveFailures++;
    circuit.consecutiveSuccesses = 0; // Reset success count

    // Add to failure history
    circuit.failureHistory.push({
      timestamp: now,
      error: error?.message || String(error),
    });

    this.logger.warn(
      `[CircuitBreaker] Failure recorded for agent: ${agentId} consecutive_failures=${circuit.consecutiveFailures} threshold=${this.options.failureThreshold} error=${error?.message}`
    );

    // Check if we should open the circuit
    if (circuit.state === CircuitState.CLOSED) {
      if (circuit.consecutiveFailures >= this.options.failureThreshold) {
        this.openCircuit(circuit);
      }
    } else if (circuit.state === CircuitState.HALF_OPEN) {
      // Failure in HALF_OPEN state -> immediately reopen
      this.openCircuit(circuit);
    }

    // Clean old failures from history
    this.cleanFailureHistory(circuit);
  }

  /**
   * Get circuit state for an agent
   *
   * @param agentId - Agent identifier
   * @returns Current circuit state
   */
  getCircuitState(agentId: string): CircuitState {
    const circuit = this.circuits.get(agentId);
    if (!circuit) {
      return CircuitState.CLOSED; // Default state
    }

    this.updateCircuitState(circuit);
    return circuit.state;
  }

  /**
   * Get circuit statistics for all agents
   *
   * Useful for monitoring and debugging
   *
   * @returns Map of agent ID to circuit info
   */
  getCircuitStats(): Map<string, Omit<CircuitInfo, 'failureHistory'>> {
    const stats = new Map<string, Omit<CircuitInfo, 'failureHistory'>>();

    for (const [agentId, circuit] of this.circuits.entries()) {
      this.updateCircuitState(circuit);

      stats.set(agentId, {
        agentId: circuit.agentId,
        state: circuit.state,
        consecutiveFailures: circuit.consecutiveFailures,
        consecutiveSuccesses: circuit.consecutiveSuccesses,
        lastFailureTime: circuit.lastFailureTime,
        lastSuccessTime: circuit.lastSuccessTime,
        openedAt: circuit.openedAt,
      });
    }

    return stats;
  }

  /**
   * Dynamically update failure threshold without resetting circuit state.
   * Useful for per-workflow configuration of circuit breaker sensitivity.
   */
  setFailureThreshold(threshold: number): void {
    this.options = { ...this.options, failureThreshold: threshold };
  }

  /**
   * Manually reset circuit for an agent
   *
   * Useful for administrative intervention
   *
   * @param agentId - Agent identifier
   */
  resetCircuit(agentId: string): void {
    const circuit = this.circuits.get(agentId);
    if (circuit) {
      this.closeCircuit(circuit);
      this.logger.info(`[CircuitBreaker] Circuit manually reset for agent: ${agentId}`);
    }
  }

  /**
   * Reset all circuits
   *
   * Useful for system-wide recovery or testing
   */
  resetAll(): void {
    this.logger.info('[CircuitBreaker] Resetting all circuits');
    this.circuits.clear();
  }

  /**
   * Get or create circuit info for an agent
   */
  private getOrCreateCircuit(agentId: string): CircuitInfo {
    let circuit = this.circuits.get(agentId);

    if (!circuit) {
      circuit = {
        agentId,
        state: CircuitState.CLOSED,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastFailureTime: 0,
        lastSuccessTime: 0,
        failureHistory: [],
      };
      this.circuits.set(agentId, circuit);
    }

    return circuit;
  }

  /**
   * Open circuit (failures exceeded threshold)
   */
  private openCircuit(circuit: CircuitInfo): void {
    const now = Date.now();

    circuit.state = CircuitState.OPEN;
    circuit.openedAt = now;
    this.executionSummary.circuitBreakerTrips++;

    this.logger.warn(`[CircuitBreaker] Circuit breaker OPEN for agent: ${circuit.agentId}`, {
      agent: { name: circuit.agentId },
      failures: circuit.consecutiveFailures,
      failureThreshold: this.options.failureThreshold,
      recentErrors: circuit.failureHistory.slice(-3).map((f) => f.error),
    });
  }

  /**
   * Close circuit (recovery confirmed)
   */
  private closeCircuit(circuit: CircuitInfo): void {
    circuit.state = CircuitState.CLOSED;
    circuit.consecutiveFailures = 0;
    circuit.consecutiveSuccesses = 0;
    circuit.openedAt = undefined;

    this.logger.info(`[CircuitBreaker] Circuit breaker CLOSED for agent: ${circuit.agentId}`, {
      agent: { name: circuit.agentId },
    });
  }

  /**
   * Transition to half-open state (testing recovery)
   */
  private halfOpenCircuit(circuit: CircuitInfo): void {
    circuit.state = CircuitState.HALF_OPEN;
    circuit.consecutiveSuccesses = 0;

    this.logger.info(
      `[CircuitBreaker] Circuit HALF-OPEN for agent: ${circuit.agentId} - Testing agent recovery with limited requests`
    );
  }

  /**
   * Update circuit state based on timeout and current state
   */
  private updateCircuitState(circuit: CircuitInfo): void {
    const now = Date.now();

    if (circuit.state === CircuitState.OPEN && circuit.openedAt) {
      const timeSinceOpened = now - circuit.openedAt;

      // If reset timeout has passed, transition to HALF_OPEN
      if (timeSinceOpened >= this.options.resetTimeoutMs) {
        this.halfOpenCircuit(circuit);
      }
    }
  }

  /**
   * Clean old failures from history (outside time window)
   */
  private cleanFailureHistory(circuit: CircuitInfo): void {
    const now = Date.now();
    const cutoff = now - this.options.failureWindowMs;

    circuit.failureHistory = circuit.failureHistory.filter((f) => f.timestamp > cutoff);
  }

  /**
   * Get failure rate for an agent (failures per minute)
   *
   * @param agentId - Agent identifier
   * @returns Failure rate (failures per minute)
   */
  getFailureRate(agentId: string): number {
    const circuit = this.circuits.get(agentId);
    if (!circuit || circuit.failureHistory.length === 0) {
      return 0;
    }

    const now = Date.now();
    const windowStart = now - this.options.failureWindowMs;

    const recentFailures = circuit.failureHistory.filter((f) => f.timestamp > windowStart);

    if (recentFailures.length === 0) {
      return 0;
    }

    // Calculate failures per minute
    const windowMinutes = this.options.failureWindowMs / 60000;
    return recentFailures.length / windowMinutes;
  }

  /**
   * Get health status for an agent
   *
   * @param agentId - Agent identifier
   * @returns Health status object
   */
  getAgentHealth(agentId: string): {
    agentId: string;
    state: CircuitState;
    healthy: boolean;
    failureRate: number;
    lastFailure?: string;
    lastSuccess?: string;
  } {
    const circuit = this.circuits.get(agentId);

    if (!circuit) {
      return {
        agentId,
        state: CircuitState.CLOSED,
        healthy: true,
        failureRate: 0,
      };
    }

    this.updateCircuitState(circuit);

    return {
      agentId,
      state: circuit.state,
      healthy: circuit.state !== CircuitState.OPEN,
      failureRate: this.getFailureRate(agentId),
      lastFailure: circuit.lastFailureTime
        ? new Date(circuit.lastFailureTime).toISOString()
        : undefined,
      lastSuccess: circuit.lastSuccessTime
        ? new Date(circuit.lastSuccessTime).toISOString()
        : undefined,
    };
  }
}
