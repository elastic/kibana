/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { ExecutionStatus } from '../types';
import type { AgentExecutionClient } from '../persistence';
import { AbortMonitor } from './abort_monitor';

const createMockExecutionClient = (
  overrides: Partial<AgentExecutionClient> = {}
): jest.Mocked<AgentExecutionClient> =>
  ({
    create: jest.fn(),
    get: jest.fn(),
    updateStatus: jest.fn(),
    appendEvents: jest.fn(),
    peek: jest.fn(),
    readEvents: jest.fn(),
    ...overrides,
  } as jest.Mocked<AgentExecutionClient>);

describe('AbortMonitor', () => {
  let logger: MockedLogger;
  let executionClient: jest.Mocked<AgentExecutionClient>;

  beforeEach(() => {
    jest.useFakeTimers();
    logger = loggerMock.create();
    executionClient = createMockExecutionClient();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not be aborted initially', () => {
    const monitor = new AbortMonitor({
      executionId: 'exec-1',
      executionClient,
      logger,
    });

    expect(monitor.getSignal().aborted).toBe(false);
    monitor.stop();
  });

  it('should trigger abort when execution status is aborted', async () => {
    executionClient.get.mockResolvedValue({
      executionId: 'exec-1',
      '@timestamp': new Date().toISOString(),
      status: ExecutionStatus.aborted,
      agentId: 'agent-1',
      spaceId: 'default',
      agentParams: { nextInput: { message: 'test' } },
      eventCount: 0,
      events: [],
    });

    const monitor = new AbortMonitor({
      executionId: 'exec-1',
      executionClient,
      logger,
    });

    monitor.start();

    // Advance timer to trigger the first poll
    jest.advanceTimersByTime(2000);

    // Wait for async operations
    await jest.advanceTimersByTimeAsync(0);

    expect(monitor.getSignal().aborted).toBe(true);
    monitor.stop();
  });

  it('should not trigger abort when execution status is running', async () => {
    executionClient.get.mockResolvedValue({
      executionId: 'exec-1',
      '@timestamp': new Date().toISOString(),
      status: ExecutionStatus.running,
      agentId: 'agent-1',
      spaceId: 'default',
      agentParams: { nextInput: { message: 'test' } },
      eventCount: 0,
      events: [],
    });

    const monitor = new AbortMonitor({
      executionId: 'exec-1',
      executionClient,
      logger,
    });

    monitor.start();

    jest.advanceTimersByTime(2000);
    await jest.advanceTimersByTimeAsync(0);

    expect(monitor.getSignal().aborted).toBe(false);
    monitor.stop();
  });

  it('should stop polling after stop() is called', async () => {
    executionClient.get.mockResolvedValue({
      executionId: 'exec-1',
      '@timestamp': new Date().toISOString(),
      status: ExecutionStatus.running,
      agentId: 'agent-1',
      spaceId: 'default',
      agentParams: { nextInput: { message: 'test' } },
      eventCount: 0,
      events: [],
    });

    const monitor = new AbortMonitor({
      executionId: 'exec-1',
      executionClient,
      logger,
    });

    monitor.start();

    // Advance and let one poll happen
    jest.advanceTimersByTime(2000);
    await jest.advanceTimersByTimeAsync(0);

    expect(executionClient.get).toHaveBeenCalledTimes(1);

    // Stop the monitor
    monitor.stop();

    // Advance more - no further polls should happen
    jest.advanceTimersByTime(4000);
    await jest.advanceTimersByTimeAsync(0);

    expect(executionClient.get).toHaveBeenCalledTimes(1);
  });

  it('should stop polling when execution status is completed', async () => {
    executionClient.get.mockResolvedValue({
      executionId: 'exec-1',
      '@timestamp': new Date().toISOString(),
      status: ExecutionStatus.completed,
      agentId: 'agent-1',
      spaceId: 'default',
      agentParams: { nextInput: { message: 'test' } },
      eventCount: 0,
      events: [],
    });

    const monitor = new AbortMonitor({
      executionId: 'exec-1',
      executionClient,
      logger,
    });

    monitor.start();

    // First poll - completed
    jest.advanceTimersByTime(2000);
    await jest.advanceTimersByTimeAsync(0);

    expect(monitor.getSignal().aborted).toBe(false);
    expect(executionClient.get).toHaveBeenCalledTimes(1);

    // No further polls should happen
    jest.advanceTimersByTime(4000);
    await jest.advanceTimersByTimeAsync(0);

    expect(executionClient.get).toHaveBeenCalledTimes(1);
  });

  it('should stop polling when execution status is failed', async () => {
    executionClient.get.mockResolvedValue({
      executionId: 'exec-1',
      '@timestamp': new Date().toISOString(),
      status: ExecutionStatus.failed,
      agentId: 'agent-1',
      spaceId: 'default',
      agentParams: { nextInput: { message: 'test' } },
      eventCount: 0,
      events: [],
    });

    const monitor = new AbortMonitor({
      executionId: 'exec-1',
      executionClient,
      logger,
    });

    monitor.start();

    // First poll - failed
    jest.advanceTimersByTime(2000);
    await jest.advanceTimersByTimeAsync(0);

    expect(monitor.getSignal().aborted).toBe(false);
    expect(executionClient.get).toHaveBeenCalledTimes(1);

    // No further polls should happen
    jest.advanceTimersByTime(4000);
    await jest.advanceTimersByTimeAsync(0);

    expect(executionClient.get).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully without stopping', async () => {
    executionClient.get.mockRejectedValueOnce(new Error('ES unavailable')).mockResolvedValueOnce({
      executionId: 'exec-1',
      '@timestamp': new Date().toISOString(),
      status: ExecutionStatus.aborted,
      agentId: 'agent-1',
      spaceId: 'default',
      agentParams: { nextInput: { message: 'test' } },
      eventCount: 0,
      events: [],
    });

    const monitor = new AbortMonitor({
      executionId: 'exec-1',
      executionClient,
      logger,
    });

    monitor.start();

    // First poll - error
    jest.advanceTimersByTime(2000);
    await jest.advanceTimersByTimeAsync(0);

    expect(monitor.getSignal().aborted).toBe(false);

    // Second poll - aborted
    jest.advanceTimersByTime(2000);
    await jest.advanceTimersByTimeAsync(0);

    expect(monitor.getSignal().aborted).toBe(true);
    monitor.stop();
  });
});
