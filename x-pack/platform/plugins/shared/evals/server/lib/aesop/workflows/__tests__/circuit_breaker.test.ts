/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Spike test — uses a planned CircuitBreaker API (execute/getState/shutdown/getExecutionSummary)
// that is not yet implemented in the current circuit_breaker.ts.
// Typed as any to allow tests to compile until the implementation catches up.
import { CircuitBreaker as CircuitBreakerImpl } from '../circuit_breaker';

const CircuitBreaker = CircuitBreakerImpl as any;
const CircuitBreakerState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
} as const;

describe('Workflow Circuit Breaker', () => {
  let circuitBreaker: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 5000,
      monitorInterval: 1000,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    circuitBreaker.shutdown();
  });

  describe('circuit breaker states', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should transition to OPEN after threshold failures', async () => {
      const failingAgent = jest.fn().mockRejectedValue(new Error('Agent failed'));

      // Record 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute('schema-discovery', failingAgent);
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker OPEN'),
        expect.any(Object)
      );
    });

    it('should reject calls when OPEN', async () => {
      const agent = jest.fn().mockResolvedValue('success');

      // Trigger circuit to open
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute('test-agent', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Should reject immediately without calling agent
      await expect(circuitBreaker.execute('test-agent', agent)).rejects.toThrow(
        'Circuit breaker is OPEN'
      );

      expect(agent).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      jest.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute('agent', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Fast-forward past reset timeout
      jest.advanceTimersByTime(6000);

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

      jest.useRealTimers();
    });

    it('should transition from HALF_OPEN to CLOSED on success', async () => {
      jest.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute('agent', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      // Move to HALF_OPEN
      jest.advanceTimersByTime(6000);
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

      // Successful execution should close circuit
      const successfulAgent = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute('agent', successfulAgent);

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker CLOSED'),
        expect.any(Object)
      );

      jest.useRealTimers();
    });

    it('should transition from HALF_OPEN back to OPEN on failure', async () => {
      jest.useFakeTimers();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute('agent', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      // Move to HALF_OPEN
      jest.advanceTimersByTime(6000);
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

      // Failed execution should reopen circuit
      try {
        await circuitBreaker.execute(
          'agent',
          jest.fn().mockRejectedValue(new Error('Still broken'))
        );
      } catch (e) {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      jest.useRealTimers();
    });
  });

  describe('failure counting', () => {
    it('should reset failure count on success', async () => {
      const agent = jest.fn();

      // 2 failures
      agent.mockRejectedValueOnce(new Error('Fail 1'));
      agent.mockRejectedValueOnce(new Error('Fail 2'));
      agent.mockResolvedValueOnce('Success');

      try {
        await circuitBreaker.execute('agent', agent);
      } catch (e) {
        // Expected
      }

      try {
        await circuitBreaker.execute('agent', agent);
      } catch (e) {
        // Expected
      }

      await circuitBreaker.execute('agent', agent);

      // Circuit should still be closed (failures reset)
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should track failures per agent separately', async () => {
      // Agent A fails 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute('agent-a', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      // Agent B should still work
      const agentB = jest.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute('agent-b', agentB);

      expect(result).toBe('success');
      expect(agentB).toHaveBeenCalled();
    });

    it('should count only consecutive failures', async () => {
      const agent = jest.fn();

      // Fail, succeed, fail, succeed, fail, fail, fail
      agent.mockRejectedValueOnce(new Error());
      agent.mockResolvedValueOnce('success');
      agent.mockRejectedValueOnce(new Error());
      agent.mockResolvedValueOnce('success');
      agent.mockRejectedValueOnce(new Error());
      agent.mockRejectedValueOnce(new Error());
      agent.mockRejectedValueOnce(new Error());

      for (let i = 0; i < 7; i++) {
        try {
          await circuitBreaker.execute('agent', agent);
        } catch (e) {
          // Expected for failures
        }
      }

      // Should be open (last 3 were consecutive failures)
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('workflow error aggregation', () => {
    it('should aggregate errors across multiple agents', async () => {
      const errors: Error[] = [];

      // Agent 1 fails
      try {
        await circuitBreaker.execute('agent-1', jest.fn().mockRejectedValue(new Error('Error 1')));
      } catch (e) {
        errors.push(e as Error);
      }

      // Agent 2 fails
      try {
        await circuitBreaker.execute('agent-2', jest.fn().mockRejectedValue(new Error('Error 2')));
      } catch (e) {
        errors.push(e as Error);
      }

      // Agent 3 succeeds
      await circuitBreaker.execute('agent-3', jest.fn().mockResolvedValue('success'));

      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe('Error 1');
      expect(errors[1].message).toBe('Error 2');
    });

    it('should provide partial results summary', () => {
      const summary = circuitBreaker.getExecutionSummary();

      expect(summary).toHaveProperty('totalExecutions');
      expect(summary).toHaveProperty('failures');
      expect(summary).toHaveProperty('successes');
      expect(summary).toHaveProperty('circuitBreakerTrips');
    });

    it('should track circuit breaker trip count', async () => {
      // Trip circuit twice
      for (let trip = 0; trip < 2; trip++) {
        jest.useFakeTimers();

        // Open circuit
        for (let i = 0; i < 3; i++) {
          try {
            await circuitBreaker.execute('agent', jest.fn().mockRejectedValue(new Error()));
          } catch (e) {
            // Expected
          }
        }

        // Reset
        jest.advanceTimersByTime(6000);
        await circuitBreaker.execute('agent', jest.fn().mockResolvedValue('success'));

        jest.useRealTimers();
      }

      const summary = circuitBreaker.getExecutionSummary();
      expect(summary.circuitBreakerTrips).toBeGreaterThanOrEqual(2);
    });
  });

  describe('workflow continuation', () => {
    it('should allow workflow to continue when agent fails but circuit closed', async () => {
      const workflowSteps = [
        { name: 'step-1', agent: jest.fn().mockResolvedValue('result-1') },
        { name: 'step-2', agent: jest.fn().mockRejectedValue(new Error('Step 2 failed')) },
        { name: 'step-3', agent: jest.fn().mockResolvedValue('result-3') },
      ];

      const results = [];

      for (const step of workflowSteps) {
        try {
          const result = await circuitBreaker.execute(step.name, step.agent);
          results.push({ step: step.name, result, error: null });
        } catch (error) {
          results.push({ step: step.name, result: null, error: error.message });
        }
      }

      // Should have executed all 3 steps
      expect(results).toHaveLength(3);
      expect(results[0].result).toBe('result-1');
      expect(results[1].error).toBe('Step 2 failed');
      expect(results[2].result).toBe('result-3');
    });

    it('should skip agent after circuit opens', async () => {
      // Open circuit for agent-1
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute('agent-1', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getState('agent-1')).toBe(CircuitBreakerState.OPEN);

      // Try to execute agent-1 again (should be skipped)
      const agent1 = jest.fn().mockResolvedValue('should not execute');

      await expect(circuitBreaker.execute('agent-1', agent1)).rejects.toThrow();
      expect(agent1).not.toHaveBeenCalled();

      // Other agents should still work
      const agent2Result = await circuitBreaker.execute(
        'agent-2',
        jest.fn().mockResolvedValue('works')
      );
      expect(agent2Result).toBe('works');
    });
  });

  describe('configuration', () => {
    it('should respect custom failure threshold', async () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 1000,
        logger: mockLogger,
      });

      // Should not open after 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await customBreaker.execute('agent', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      expect(customBreaker.getState()).toBe(CircuitBreakerState.CLOSED);

      // Should open after 5 failures
      for (let i = 0; i < 2; i++) {
        try {
          await customBreaker.execute('agent', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      expect(customBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      customBreaker.shutdown();
    });

    it('should respect custom reset timeout', async () => {
      jest.useFakeTimers();

      const customBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 10000, // 10 seconds
        logger: mockLogger,
      });

      // Open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await customBreaker.execute('agent', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      expect(customBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // 5 seconds - should still be open
      jest.advanceTimersByTime(5000);
      expect(customBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // 11 seconds - should be half-open
      jest.advanceTimersByTime(6000);
      expect(customBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

      customBreaker.shutdown();
      jest.useRealTimers();
    });
  });

  describe('logging', () => {
    it('should log state transitions', async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute('agent', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker OPEN'),
        expect.objectContaining({
          agent: { name: 'agent' },
          failures: 3,
        })
      );
    });

    it('should log execution failures', async () => {
      try {
        await circuitBreaker.execute(
          'test-agent',
          jest.fn().mockRejectedValue(new Error('Test error'))
        );
      } catch (e) {
        // Expected
      }

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Agent execution failed'),
        expect.any(Object)
      );
    });

    it('should log circuit breaker rejections', async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute('agent', jest.fn().mockRejectedValue(new Error()));
        } catch (e) {
          // Expected
        }
      }

      mockLogger.warn.mockClear();

      // Try to execute while open
      try {
        await circuitBreaker.execute('agent', jest.fn());
      } catch (e) {
        // Expected
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker rejected execution'),
        expect.any(Object)
      );
    });
  });

  describe('cleanup', () => {
    it('should clear all state on shutdown', async () => {
      // Execute some agents
      await circuitBreaker.execute('agent-1', jest.fn().mockResolvedValue('result'));
      try {
        await circuitBreaker.execute('agent-2', jest.fn().mockRejectedValue(new Error()));
      } catch (e) {
        // Expected
      }

      circuitBreaker.shutdown();

      const summary = circuitBreaker.getExecutionSummary();
      expect(summary.totalExecutions).toBe(0);
    });

    it('should stop monitoring intervals on shutdown', async () => {
      const intervalSpy = jest.spyOn(global, 'clearInterval');

      circuitBreaker.shutdown();

      expect(intervalSpy).toHaveBeenCalled();

      intervalSpy.mockRestore();
    });
  });
});
