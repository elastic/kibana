/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { AgentExecutionClient } from '../persistence';
import { HeartbeatReporter } from './heartbeat_reporter';
import { EXECUTION_HEARTBEAT_INTERVAL_MS } from '../constants';

const createMockExecutionClient = (
  overrides: Partial<AgentExecutionClient> = {}
): jest.Mocked<AgentExecutionClient> =>
  ({
    create: jest.fn(),
    get: jest.fn(),
    updateStatus: jest.fn(),
    appendEvents: jest.fn(),
    updateHeartbeat: jest.fn().mockResolvedValue(undefined),
    peek: jest.fn(),
    readEvents: jest.fn(),
    find: jest.fn(),
    ...overrides,
  } as jest.Mocked<AgentExecutionClient>);

describe('HeartbeatReporter', () => {
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

  it('writes an initial heartbeat immediately on start', () => {
    const reporter = new HeartbeatReporter({ executionId: 'exec-1', executionClient, logger });

    reporter.start();

    expect(executionClient.updateHeartbeat).toHaveBeenCalledTimes(1);
    expect(executionClient.updateHeartbeat).toHaveBeenCalledWith('exec-1');

    reporter.stop();
  });

  it('writes heartbeats periodically at the configured interval', async () => {
    const reporter = new HeartbeatReporter({ executionId: 'exec-1', executionClient, logger });

    reporter.start();
    expect(executionClient.updateHeartbeat).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(EXECUTION_HEARTBEAT_INTERVAL_MS);
    expect(executionClient.updateHeartbeat).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(EXECUTION_HEARTBEAT_INTERVAL_MS);
    expect(executionClient.updateHeartbeat).toHaveBeenCalledTimes(3);

    reporter.stop();
  });

  it('stops writing heartbeats after stop() is called', async () => {
    const reporter = new HeartbeatReporter({ executionId: 'exec-1', executionClient, logger });

    reporter.start();
    expect(executionClient.updateHeartbeat).toHaveBeenCalledTimes(1);

    reporter.stop();

    await jest.advanceTimersByTimeAsync(EXECUTION_HEARTBEAT_INTERVAL_MS * 3);
    expect(executionClient.updateHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('does not start after being stopped', () => {
    const reporter = new HeartbeatReporter({ executionId: 'exec-1', executionClient, logger });

    reporter.stop();
    reporter.start();

    expect(executionClient.updateHeartbeat).not.toHaveBeenCalled();
  });

  it('keeps reporting and logs a warning when a heartbeat write fails', async () => {
    executionClient.updateHeartbeat.mockRejectedValue(new Error('ES unavailable'));

    const reporter = new HeartbeatReporter({ executionId: 'exec-1', executionClient, logger });

    reporter.start();
    // Flush the rejected leading-edge write's microtasks so the .catch handler runs.
    await jest.advanceTimersByTimeAsync(0);
    expect(logger.warn).toHaveBeenCalled();

    // A failed write must not stop the interval.
    await jest.advanceTimersByTimeAsync(EXECUTION_HEARTBEAT_INTERVAL_MS);
    expect(executionClient.updateHeartbeat).toHaveBeenCalledTimes(2);

    reporter.stop();
  });
});
