/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import type { BackgroundExecutionState } from '@kbn/agent-builder-common/chat';
import { createHitlWorkflowChecker } from '.';
import type { WorkflowExecutionPoller } from '.';

const makePoller = (
  result: { status: string; output?: unknown; error_message?: string } | null
): WorkflowExecutionPoller => jest.fn().mockResolvedValue(result);

const runningEntry = (executionId: string): BackgroundExecutionState => ({
  execution_id: executionId,
  kind: 'hitl_workflow',
  status: ExecutionStatus.running,
});

describe('createHitlWorkflowChecker', () => {
  describe('register', () => {
    it('returns a hitl_workflow BackgroundExecutionState with running status', () => {
      const { register } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller(null),
      });

      const state = register('exec-hitl-1');

      expect(state).toEqual({
        execution_id: 'exec-hitl-1',
        kind: 'hitl_workflow',
        status: ExecutionStatus.running,
      });
    });
  });

  describe('check', () => {
    it('calls the poller with the entry execution_id', async () => {
      const poller = makePoller({ status: 'COMPLETED', output: { result: 'ok' } });
      const { check } = createHitlWorkflowChecker({ logger: loggerMock.create(), poller });

      await check(runningEntry('exec-hitl-1'), { roundId: 'round-1' });

      expect(poller).toHaveBeenCalledWith('exec-hitl-1');
    });

    it('returns undefined when the poller returns null', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller(null),
      });

      const result = await check(runningEntry('exec-hitl-1'), { roundId: 'round-1' });

      expect(result).toBeUndefined();
    });

    it('returns undefined when the workflow status is not terminal', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller({ status: 'RUNNING' }),
      });

      const result = await check(runningEntry('exec-hitl-1'), { roundId: 'round-1' });

      expect(result).toBeUndefined();
    });

    it('returns a completed state when the workflow status is COMPLETED', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller({ status: 'COMPLETED', output: { result: 'ok' } }),
      });

      const result = await check(runningEntry('exec-hitl-1'), { roundId: 'round-1' });

      expect(result).toMatchObject({
        execution_id: 'exec-hitl-1',
        kind: 'hitl_workflow',
        status: ExecutionStatus.completed,
      });
    });

    it('sets response.message to safeJsonStringify output when COMPLETED with output', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller({ status: 'COMPLETED', output: { result: 'approved' } }),
      });

      const result = await check(runningEntry('exec-hitl-1'), { roundId: 'round-1' });

      expect(result?.response?.message).toBe('{"result":"approved"}');
    });

    it('falls back to "Workflow completed." when COMPLETED output is undefined', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller({ status: 'COMPLETED' }),
      });

      const result = await check(runningEntry('exec-hitl-1'), { roundId: 'round-1' });

      expect(result?.response?.message).toBe('Workflow completed.');
    });

    it('sets completed_at with roundId and toolCallGroupId', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller({ status: 'COMPLETED' }),
      });

      const result = await check(runningEntry('exec-hitl-1'), {
        roundId: 'round-1',
        toolCallGroupId: 'group-abc',
      });

      expect(result?.completed_at).toEqual({
        round_id: 'round-1',
        tool_call_group_id: 'group-abc',
      });
    });

    it('maps COMPLETED status to ExecutionStatus.completed', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller({ status: 'COMPLETED' }),
      });

      const result = await check(runningEntry('exec-hitl-1'), { roundId: 'round-1' });

      expect(result?.status).toBe(ExecutionStatus.completed);
    });

    it('returns a failed state when the workflow status is FAILED', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller({ status: 'FAILED', error_message: 'workflow crashed' }),
      });

      const result = await check(runningEntry('exec-hitl-1'), { roundId: 'round-1' });

      expect(result).toMatchObject({
        execution_id: 'exec-hitl-1',
        kind: 'hitl_workflow',
        status: ExecutionStatus.failed,
      });
    });

    it('maps FAILED status to ExecutionStatus.failed', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller({ status: 'FAILED' }),
      });

      const result = await check(runningEntry('exec-hitl-1'), { roundId: 'round-1' });

      expect(result?.status).toBe(ExecutionStatus.failed);
    });

    it('sets error with code internal_error and message when FAILED with error_message', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller({ status: 'FAILED', error_message: 'workflow crashed' }),
      });

      const result = await check(runningEntry('exec-hitl-1'), { roundId: 'round-1' });

      expect(result?.error).toEqual({
        code: 'internal_error',
        message: 'workflow crashed',
      });
    });

    it('preserves all fields from the entry in the returned state', async () => {
      const { check } = createHitlWorkflowChecker({
        logger: loggerMock.create(),
        poller: makePoller({ status: 'COMPLETED' }),
      });
      const entry: BackgroundExecutionState = {
        ...runningEntry('exec-hitl-1'),
      };

      const result = await check(entry, { roundId: 'round-1' });

      expect(result?.execution_id).toBe('exec-hitl-1');
      expect(result?.kind).toBe('hitl_workflow');
    });
  });
});
