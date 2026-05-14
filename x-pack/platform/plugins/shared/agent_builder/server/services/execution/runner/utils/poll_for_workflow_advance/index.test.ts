/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';

jest.mock('@kbn/agent-builder-tools-base/workflows', () => ({
  getExecutionState: jest.fn(),
}));

import { getExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import { pollForWorkflowAdvance } from '.';

const getExecutionStateMock = getExecutionState as jest.MockedFn<typeof getExecutionState>;

const makeExecution = (
  overrides: Partial<WorkflowExecutionState> = {}
): WorkflowExecutionState => ({
  execution_id: 'exec-1',
  started_at: '2026-01-01T00:00:00.000Z',
  status: ExecutionStatus.WAITING_FOR_INPUT,
  workflow_id: 'wf-1',
  waiting_input: {
    message: 'Please approve',
    schema: {},
    step_execution_id: 'step-1',
  },
  ...overrides,
});

const makeLogger = () => ({
  debug: jest.fn(),
});

const mockWorkflowApi = {} as any;

describe('pollForWorkflowAdvance', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getExecutionStateMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('[S3] returns immediately when terminal status on first poll and emits poll.terminal log', async () => {
    const completed = makeExecution({
      status: ExecutionStatus.COMPLETED,
      waiting_input: undefined,
    });
    getExecutionStateMock.mockResolvedValue(completed);
    const logger = makeLogger();

    const result = await pollForWorkflowAdvance({
      executionId: 'exec-1',
      logger: logger as any,
      maxAttempts: 5,
      pollIntervalMs: 100,
      previousStepExecutionId: 'step-1',
      spaceId: 'default',
      workflowApi: mockWorkflowApi,
    });

    expect(result?.status).toBe(ExecutionStatus.COMPLETED);
    expect(getExecutionStateMock).toHaveBeenCalledTimes(1);

    const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
    );
    expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] poll.start'))).toBe(true);
    expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] poll.terminal'))).toBe(true);
  });

  it('returns null when execution not found and emits poll.notFound log', async () => {
    getExecutionStateMock.mockResolvedValue(null);
    const logger = makeLogger();

    const result = await pollForWorkflowAdvance({
      executionId: 'exec-1',
      logger: logger as any,
      maxAttempts: 5,
      pollIntervalMs: 100,
      previousStepExecutionId: 'step-1',
      spaceId: 'default',
      workflowApi: mockWorkflowApi,
    });

    expect(result).toBeNull();
    expect(getExecutionStateMock).toHaveBeenCalledTimes(1);

    const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
    );
    expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] poll.notFound'))).toBe(true);
  });

  it('[S1] returns when step_execution_id changes on second poll (fast TaskManager) and emits poll.advanced log', async () => {
    const step1 = makeExecution();
    const step2 = makeExecution({
      waiting_input: { message: 'Step 2', schema: {}, step_execution_id: 'step-2' },
    });
    getExecutionStateMock.mockResolvedValueOnce(step1).mockResolvedValueOnce(step2);
    const logger = makeLogger();

    const promise = pollForWorkflowAdvance({
      executionId: 'exec-1',
      logger: logger as any,
      maxAttempts: 5,
      pollIntervalMs: 100,
      previousStepExecutionId: 'step-1',
      spaceId: 'default',
      workflowApi: mockWorkflowApi,
    });

    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result?.waiting_input?.step_execution_id).toBe('step-2');
    expect(getExecutionStateMock).toHaveBeenCalledTimes(2);

    const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
    );
    expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] poll.advanced'))).toBe(true);
    expect(msgs.some((m: string) => m.includes('stepId=step-2'))).toBe(true);
  });

  it('[S9] returns null after maxAttempts without advancement (poll timeout) and emits poll.timeout log', async () => {
    const step1 = makeExecution();
    getExecutionStateMock.mockResolvedValue(step1);
    const logger = makeLogger();

    const promise = pollForWorkflowAdvance({
      executionId: 'exec-1',
      logger: logger as any,
      maxAttempts: 3,
      pollIntervalMs: 100,
      previousStepExecutionId: 'step-1',
      spaceId: 'default',
      workflowApi: mockWorkflowApi,
    });

    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBeNull();
    expect(getExecutionStateMock).toHaveBeenCalledTimes(3);

    const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
    );
    expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] poll.timeout'))).toBe(true);
  });

  it('[S2] returns the advanced state on attempt N (slow TaskManager) and emits poll.advanced log', async () => {
    const step1 = makeExecution();
    const step2 = makeExecution({
      waiting_input: { message: 'Step 2', schema: {}, step_execution_id: 'step-2' },
    });
    getExecutionStateMock
      .mockResolvedValueOnce(step1)
      .mockResolvedValueOnce(step1)
      .mockResolvedValueOnce(step2);
    const logger = makeLogger();

    const promise = pollForWorkflowAdvance({
      executionId: 'exec-1',
      logger: logger as any,
      maxAttempts: 5,
      pollIntervalMs: 100,
      previousStepExecutionId: 'step-1',
      spaceId: 'default',
      workflowApi: mockWorkflowApi,
    });

    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result?.waiting_input?.step_execution_id).toBe('step-2');
    expect(getExecutionStateMock).toHaveBeenCalledTimes(3);

    const msgs = logger.debug.mock.calls.map((c: unknown[]) =>
      typeof c[0] === 'function' ? (c[0] as () => string)() : String(c[0])
    );
    // poll.attempt should appear twice (attempts 1 and 2 still step-1, attempt 3 step-2)
    expect(
      msgs.filter((m: string) => m.includes('[hitl-debug][ab] poll.attempt')).length
    ).toBeGreaterThanOrEqual(2);
    expect(msgs.some((m: string) => m.includes('[hitl-debug][ab] poll.advanced'))).toBe(true);
  });

  it('continues polling through transient RUNNING state to reach next WAITING_FOR_INPUT (multi-step HITL)', async () => {
    // Reproduces the two-step HITL bug: after step 1 is approved, the workflow
    // transitions WAITING_FOR_INPUT(step-1) → RUNNING → WAITING_FOR_INPUT(step-2).
    // The old code terminated at RUNNING (not WAITING_FOR_INPUT), so step-2 was
    // never surfaced. The fix: only terminal statuses (COMPLETED, FAILED, etc.)
    // end the poll — RUNNING is transient and must be polled through.
    const running = makeExecution({
      status: ExecutionStatus.RUNNING,
      waiting_input: undefined,
    });
    const step2 = makeExecution({
      waiting_input: { message: 'Please confirm', schema: {}, step_execution_id: 'step-2' },
    });
    getExecutionStateMock
      .mockResolvedValueOnce(running) // transient between step 1 and step 2
      .mockResolvedValueOnce(step2);

    const promise = pollForWorkflowAdvance({
      executionId: 'exec-1',
      logger: makeLogger() as any,
      maxAttempts: 5,
      pollIntervalMs: 100,
      previousStepExecutionId: 'step-1',
      spaceId: 'default',
      workflowApi: mockWorkflowApi,
    });

    await jest.runAllTimersAsync();

    const result = await promise;
    // Must resolve to the step-2 state, NOT the transient RUNNING state
    expect(result?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    expect(result?.waiting_input?.step_execution_id).toBe('step-2');
    expect(getExecutionStateMock).toHaveBeenCalledTimes(2);
  });

  it('returns terminal state when workflow completes after transitioning through RUNNING', async () => {
    // After the last waitForInput step is approved, workflow goes RUNNING → COMPLETED.
    // The poll must still resolve to COMPLETED (not time out).
    const running = makeExecution({
      status: ExecutionStatus.RUNNING,
      waiting_input: undefined,
    });
    const completed = makeExecution({
      status: ExecutionStatus.COMPLETED,
      waiting_input: undefined,
    });
    getExecutionStateMock.mockResolvedValueOnce(running).mockResolvedValueOnce(completed);

    const promise = pollForWorkflowAdvance({
      executionId: 'exec-1',
      logger: makeLogger() as any,
      maxAttempts: 5,
      pollIntervalMs: 100,
      previousStepExecutionId: 'step-1',
      spaceId: 'default',
      workflowApi: mockWorkflowApi,
    });

    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result?.status).toBe(ExecutionStatus.COMPLETED);
    expect(getExecutionStateMock).toHaveBeenCalledTimes(2);
  });
});
