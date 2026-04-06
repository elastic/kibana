/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Error Recovery Tests
 *
 * Tests retry logic, circuit breaker, and workflow error recovery.
 */

import type { Logger } from '@kbn/logging';
import {
  WorkflowRetryHandler,
  MaxRetriesExceededError,
} from '../../lib/aesop/workflows/retry_handler';
import { CircuitBreaker, CircuitState } from '../../lib/aesop/workflows/circuit_breaker';
import { WorkflowExecutorWithRecovery } from '../../lib/aesop/workflows/workflow_executor_with_recovery';

describe('Workflow Error Recovery', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
  });

  describe('RetryHandler', () => {
    it('should succeed on first attempt', async () => {
      const retryHandler = new WorkflowRetryHandler(mockLogger);

      let attempts = 0;
      const operation = jest.fn(async () => {
        attempts++;
        return 'success';
      });

      const result = await retryHandler.executeWithRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient failure and eventually succeed', async () => {
      const retryHandler = new WorkflowRetryHandler(mockLogger);

      let attempts = 0;
      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error('Service unavailable');
          error.statusCode = 503;
          throw error;
        }
        return 'success';
      });

      const result = await retryHandler.executeWithRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw MaxRetriesExceededError after max retries', async () => {
      const retryHandler = new WorkflowRetryHandler(mockLogger);

      const operation = jest.fn(async () => {
        const error: any = new Error('Service unavailable');
        error.statusCode = 503;
        throw error;
      });

      await expect(
        retryHandler.executeWithRetry(operation, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          operationName: 'test_operation',
        })
      ).rejects.toThrow(MaxRetriesExceededError);

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors (400)', async () => {
      const retryHandler = new WorkflowRetryHandler(mockLogger);

      const operation = jest.fn(async () => {
        const error: any = new Error('Bad request');
        error.statusCode = 400;
        throw error;
      });

      await expect(
        retryHandler.executeWithRetry(operation, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
        })
      ).rejects.toThrow('Bad request');

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should use exponential backoff', async () => {
      const retryHandler = new WorkflowRetryHandler(mockLogger);

      const delays: number[] = [];
      let attempts = 0;

      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 4) {
          const error: any = new Error('Timeout');
          error.statusCode = 504;
          throw error;
        }
        return 'success';
      });

      await retryHandler.executeWithRetry(operation, {
        maxRetries: 4,
        initialDelayMs: 100,
        maxDelayMs: 10000,
        onRetry: (attempt, error, delayMs) => {
          delays.push(delayMs);
        },
      });

      expect(delays.length).toBe(3); // 3 retries
      // Verify exponential increase (with jitter, so approximate)
      expect(delays[1]).toBeGreaterThan(delays[0] * 1.5);
      expect(delays[2]).toBeGreaterThan(delays[1] * 1.5);
    });

    it('should respect maxDelayMs cap', async () => {
      const retryHandler = new WorkflowRetryHandler(mockLogger);

      const delays: number[] = [];

      const operation = jest.fn(async () => {
        const error: any = new Error('Timeout');
        error.statusCode = 504;
        throw error;
      });

      await expect(
        retryHandler.executeWithRetry(operation, {
          maxRetries: 5,
          initialDelayMs: 10,
          maxDelayMs: 30,
          onRetry: (attempt, error, delayMs) => {
            delays.push(delayMs);
          },
        })
      ).rejects.toThrow(MaxRetriesExceededError);

      // All delays should be ≤ maxDelayMs
      delays.forEach((delay) => {
        expect(delay).toBeLessThanOrEqual(30);
      });
    });

    it('should handle custom isRetryable predicate', async () => {
      const retryHandler = new WorkflowRetryHandler(mockLogger);

      const operation = jest.fn(async () => {
        throw new Error('CustomError');
      });

      // Custom predicate: retry if error message contains "Custom"
      const customRetryable = (error: any) => error.message?.includes('Custom');

      await expect(
        retryHandler.executeWithRetry(operation, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          isRetryable: customRetryable,
        })
      ).rejects.toThrow(MaxRetriesExceededError);

      expect(operation).toHaveBeenCalledTimes(3); // Should retry
    });

    it('should return metadata with executeWithRetryMetadata', async () => {
      const retryHandler = new WorkflowRetryHandler(mockLogger);

      let attempts = 0;
      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 2) {
          const error: any = new Error('Retry me');
          error.statusCode = 503;
          throw error;
        }
        return 'success';
      });

      const result = await retryHandler.executeWithRetryMetadata(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      expect(result.result).toBe('success');
      expect(result.attempts).toBe(2);
      expect(result.totalDelayMs).toBeGreaterThan(0);
    });
  });

  describe('CircuitBreaker', () => {
    it('should start in CLOSED state', () => {
      const circuitBreaker = new CircuitBreaker(mockLogger);

      const state = circuitBreaker.getCircuitState('agent1');
      expect(state).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.shouldSkipAgent('agent1')).toBe(false);
    });

    it('should open circuit after failure threshold', () => {
      const circuitBreaker = new CircuitBreaker(mockLogger, {
        failureThreshold: 3,
        resetTimeoutMs: 60000,
        successThreshold: 2,
        failureWindowMs: 300000,
      });

      // Record 3 failures
      circuitBreaker.recordFailure('agent1', new Error('Failure 1'));
      circuitBreaker.recordFailure('agent1', new Error('Failure 2'));
      circuitBreaker.recordFailure('agent1', new Error('Failure 3'));

      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.OPEN);
      expect(circuitBreaker.shouldSkipAgent('agent1')).toBe(true);
    });

    it('should reset consecutive failures on success', () => {
      const circuitBreaker = new CircuitBreaker(mockLogger, {
        failureThreshold: 3,
        resetTimeoutMs: 60000,
        successThreshold: 2,
        failureWindowMs: 300000,
      });

      circuitBreaker.recordFailure('agent1', new Error('Failure 1'));
      circuitBreaker.recordFailure('agent1', new Error('Failure 2'));
      circuitBreaker.recordSuccess('agent1'); // Reset

      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.shouldSkipAgent('agent1')).toBe(false);

      // Should need 3 more failures to open
      circuitBreaker.recordFailure('agent1', new Error('Failure 3'));
      circuitBreaker.recordFailure('agent1', new Error('Failure 4'));
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.CLOSED); // Still closed

      circuitBreaker.recordFailure('agent1', new Error('Failure 5'));
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.OPEN); // Now open
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      jest.useFakeTimers();

      const circuitBreaker = new CircuitBreaker(mockLogger, {
        failureThreshold: 2,
        resetTimeoutMs: 1000, // 1 second
        successThreshold: 2,
        failureWindowMs: 300000,
      });

      // Open the circuit
      circuitBreaker.recordFailure('agent1', new Error('Failure 1'));
      circuitBreaker.recordFailure('agent1', new Error('Failure 2'));
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.OPEN);

      // Advance time past reset timeout
      jest.advanceTimersByTime(1500);

      // Circuit should transition to HALF_OPEN
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.HALF_OPEN);
      expect(circuitBreaker.shouldSkipAgent('agent1')).toBe(false); // Allows requests in HALF_OPEN

      jest.useRealTimers();
    });

    it('should close circuit after success threshold in HALF_OPEN state', async () => {
      jest.useFakeTimers();

      const circuitBreaker = new CircuitBreaker(mockLogger, {
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        successThreshold: 2,
        failureWindowMs: 300000,
      });

      // Open circuit
      circuitBreaker.recordFailure('agent1', new Error('Failure 1'));
      circuitBreaker.recordFailure('agent1', new Error('Failure 2'));

      // Advance to HALF_OPEN
      jest.advanceTimersByTime(1500);
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.HALF_OPEN);

      // Record successes
      circuitBreaker.recordSuccess('agent1');
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.HALF_OPEN); // Still half-open

      circuitBreaker.recordSuccess('agent1');
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.CLOSED); // Now closed

      jest.useRealTimers();
    });

    it('should reopen circuit on failure in HALF_OPEN state', async () => {
      jest.useFakeTimers();

      const circuitBreaker = new CircuitBreaker(mockLogger, {
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        successThreshold: 2,
        failureWindowMs: 300000,
      });

      // Open circuit
      circuitBreaker.recordFailure('agent1', new Error('Failure 1'));
      circuitBreaker.recordFailure('agent1', new Error('Failure 2'));

      // Advance to HALF_OPEN
      jest.advanceTimersByTime(1500);
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.HALF_OPEN);

      // Record failure in HALF_OPEN state
      circuitBreaker.recordFailure('agent1', new Error('Failure 3'));
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.OPEN); // Reopened

      jest.useRealTimers();
    });

    it('should track per-agent circuits independently', () => {
      const circuitBreaker = new CircuitBreaker(mockLogger, {
        failureThreshold: 2,
        resetTimeoutMs: 60000,
        successThreshold: 2,
        failureWindowMs: 300000,
      });

      // Fail agent1
      circuitBreaker.recordFailure('agent1', new Error('Failure'));
      circuitBreaker.recordFailure('agent1', new Error('Failure'));
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.OPEN);

      // Agent2 should still be CLOSED
      expect(circuitBreaker.getCircuitState('agent2')).toBe(CircuitState.CLOSED);

      // Agent2 can still receive requests
      expect(circuitBreaker.shouldSkipAgent('agent2')).toBe(false);
    });

    it('should calculate failure rate correctly', () => {
      const circuitBreaker = new CircuitBreaker(mockLogger, {
        failureThreshold: 10,
        resetTimeoutMs: 60000,
        successThreshold: 2,
        failureWindowMs: 60000, // 1 minute window
      });

      // Record 5 failures
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure('agent1', new Error(`Failure ${i + 1}`));
      }

      const failureRate = circuitBreaker.getFailureRate('agent1');
      expect(failureRate).toBe(5); // 5 failures per minute
    });

    it('should reset circuit manually', () => {
      const circuitBreaker = new CircuitBreaker(mockLogger, {
        failureThreshold: 2,
        resetTimeoutMs: 60000,
        successThreshold: 2,
        failureWindowMs: 300000,
      });

      // Open circuit
      circuitBreaker.recordFailure('agent1', new Error('Failure 1'));
      circuitBreaker.recordFailure('agent1', new Error('Failure 2'));
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.OPEN);

      // Manual reset
      circuitBreaker.resetCircuit('agent1');
      expect(circuitBreaker.getCircuitState('agent1')).toBe(CircuitState.CLOSED);
    });
  });

  describe('WorkflowExecutorWithRecovery', () => {
    it('should execute all agents successfully', async () => {
      const mockAgentInvoker = jest.fn(async (agentId: string) => {
        return { agentId, result: 'success' };
      });

      const executor = new WorkflowExecutorWithRecovery(mockAgentInvoker, mockLogger);

      const result = await executor.executeWorkflow({
        agents: ['agent1', 'agent2', 'agent3'],
        continueOnFailure: true,
      });

      expect(result.status).toBe('completed');
      expect(result.successfulAgents).toBe(3);
      expect(result.failedAgents).toBe(0);
      expect(result.skippedAgents).toBe(0);
      expect(mockAgentInvoker).toHaveBeenCalledTimes(3);
    });

    it('should continue on failure and collect partial results', async () => {
      const mockAgentInvoker = jest.fn(async (agentId: string) => {
        if (agentId === 'agent2') {
          throw new Error('Agent2 failed');
        }
        return { agentId, result: 'success' };
      });

      const executor = new WorkflowExecutorWithRecovery(mockAgentInvoker, mockLogger);

      const result = await executor.executeWorkflow({
        agents: ['agent1', 'agent2', 'agent3'],
        continueOnFailure: true,
      });

      expect(result.status).toBe('partial');
      expect(result.successfulAgents).toBe(2); // agent1, agent3
      expect(result.failedAgents).toBe(1); // agent2
      expect(result.errorSummary).toHaveLength(1);
      expect(result.errorSummary[0].agentId).toBe('agent2');
    });

    it('should stop execution on failure when continueOnFailure=false', async () => {
      const mockAgentInvoker = jest.fn(async (agentId: string) => {
        if (agentId === 'agent2') {
          throw new Error('Agent2 failed');
        }
        return { agentId, result: 'success' };
      });

      const executor = new WorkflowExecutorWithRecovery(mockAgentInvoker, mockLogger);

      const result = await executor.executeWorkflow({
        agents: ['agent1', 'agent2', 'agent3'],
        continueOnFailure: false,
      });

      expect(result.status).toBe('partial');
      expect(result.successfulAgents).toBe(1); // Only agent1
      expect(result.failedAgents).toBe(1); // agent2
      expect(mockAgentInvoker).toHaveBeenCalledTimes(2); // Stopped after agent2
    });

    it('should skip agents when circuit is open', async () => {
      let invocationCount = 0;

      const mockAgentInvoker = jest.fn(async (agentId: string) => {
        invocationCount++;
        if (agentId === 'agent1') {
          const err: any = new Error('Agent1 failed');
          err.statusCode = 503; // Retryable
          throw err;
        }
        return { agentId, result: 'success' };
      });

      const executor = new WorkflowExecutorWithRecovery(mockAgentInvoker, mockLogger);

      // First execution: agent1 will fail and open circuit after retries
      await executor.executeWorkflow({
        agents: ['agent1'],
        continueOnFailure: true,
        maxRetries: 2, // Fail after 2 retries
        failureThreshold: 2, // Open circuit after 2 failures
      });

      expect(invocationCount).toBe(2); // Initial + 1 retry

      // Second execution: agent1 should be skipped (circuit open)
      invocationCount = 0;
      const result2 = await executor.executeWorkflow({
        agents: ['agent1', 'agent2'],
        continueOnFailure: true,
      });

      expect(result2.skippedAgents).toBe(1); // agent1 skipped
      expect(result2.successfulAgents).toBe(1); // agent2 succeeded
      expect(invocationCount).toBe(1); // Only agent2 invoked
    });

    it('should handle timeout correctly', async () => {
      const mockAgentInvoker = jest.fn(
        async (agentId: string) =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ agentId, result: 'success' }), 5000); // 5s delay
          })
      );

      const executor = new WorkflowExecutorWithRecovery(mockAgentInvoker, mockLogger);

      const result = await executor.executeWorkflow({
        agents: ['agent1'],
        continueOnFailure: true,
        timeoutMs: 100, // 100ms timeout
        maxRetries: 1, // No retries
      });

      expect(result.status).toBe('failed');
      expect(result.failedAgents).toBe(1);
      expect(result.errorSummary[0].error).toContain('timeout');
    });

    it('should provide agent health status', async () => {
      const mockAgentInvoker = jest.fn(async (agentId: string) => {
        if (agentId === 'agent1') {
          const err: any = new Error('Agent1 failed');
          err.statusCode = 503; // Retryable
          throw err;
        }
        return { agentId, result: 'success' };
      });

      const executor = new WorkflowExecutorWithRecovery(mockAgentInvoker, mockLogger);

      await executor.executeWorkflow({
        agents: ['agent1', 'agent2'],
        continueOnFailure: true,
        maxRetries: 2,
        failureThreshold: 2,
      });

      const healthStatus = executor.getAgentHealthStatus();

      expect(healthStatus.has('agent1')).toBe(true);
      expect(healthStatus.get('agent1')?.healthy).toBe(false);
      expect(healthStatus.get('agent1')?.state).toBe(CircuitState.OPEN);

      expect(healthStatus.has('agent2')).toBe(true);
      expect(healthStatus.get('agent2')?.healthy).toBe(true);
      expect(healthStatus.get('agent2')?.state).toBe(CircuitState.CLOSED);
    });
  });
});
