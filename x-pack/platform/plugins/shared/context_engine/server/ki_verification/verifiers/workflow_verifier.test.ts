/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/core-security-server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { KiVerifierContext } from '../types';
import type { KiVerifierWorkflowRunner } from './workflow_verifier';
import {
  createWorkflowVerifier,
  WORKFLOW_VERIFIER_POLL_INTERVAL_MS,
  WORKFLOW_VERIFIER_TRIGGERED_BY,
} from './workflow_verifier';

const request = { headers: {} } as unknown as KibanaRequest;
const spaceId = 'space-a';
const executionId = 'exec-1';

const execution = (
  status: ExecutionStatus,
  overrides: Partial<{ output: unknown; error: { type: string; message: string } }> = {}
): WorkflowExecutionDto =>
  ({
    status,
    error: overrides.error ?? null,
    context: 'output' in overrides ? { output: overrides.output } : undefined,
  } as unknown as WorkflowExecutionDto);

describe('createWorkflowVerifier', () => {
  let workflowsManagement: jest.Mocked<KiVerifierWorkflowRunner>;
  let auditLogger: jest.Mocked<AuditLogger>;
  let context: KiVerifierContext;

  const makeVerifier = (definition: Partial<Parameters<typeof createWorkflowVerifier>[0]> = {}) =>
    createWorkflowVerifier(
      { workflow_id: 'my-verifier', ...definition },
      { workflowsManagement, request, spaceId, auditLogger }
    );

  beforeEach(() => {
    jest.useFakeTimers();
    auditLogger = { log: jest.fn(), enabled: true, includeSavedObjectNames: false };
    workflowsManagement = {
      executeWorkflow: jest.fn().mockResolvedValue({ workflowExecutionId: executionId }),
      getWorkflowExecution: jest.fn(),
      cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    };
    context = {
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      logger: loggingSystemMock.createLogger(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('prefixes the id with workflow:', () => {
    expect(makeVerifier().id).toBe('workflow:my-verifier');
  });

  describe('applies', () => {
    it('applies to every KI by default', () => {
      expect(makeVerifier().applies({}, context)).toBe(true);
    });

    it('filters by type', () => {
      const verifier = makeVerifier({ applies_to: { types: ['runbook'] } });

      expect(verifier.applies({ type: 'runbook' }, context)).toBe(true);
      expect(verifier.applies({ type: 'faq' }, context)).toBe(false);
      expect(verifier.applies({}, context)).toBe(false);
    });

    it('filters by attribute keys', () => {
      const verifier = makeVerifier({ applies_to: { attributes: ['esql', 'owner'] } });

      expect(verifier.applies({ attributes: { esql: 'FROM x', owner: 'me' } }, context)).toBe(true);
      expect(verifier.applies({ attributes: { esql: 'FROM x' } }, context)).toBe(false);
    });
  });

  describe('verify', () => {
    const completed = (output: unknown) => {
      workflowsManagement.getWorkflowExecution.mockResolvedValue(
        execution(ExecutionStatus.COMPLETED, { output })
      );
    };

    it('dispatches the workflow with the KI as input without waiting', async () => {
      completed({ passed: true });
      const ki = { type: 'runbook', title: 'x' };

      await makeVerifier().verify(ki, context);

      expect(workflowsManagement.executeWorkflow).toHaveBeenCalledWith({
        workflowId: 'my-verifier',
        inputs: { ki },
        request,
        spaceId,
        waitForCompletion: false,
        triggeredBy: WORKFLOW_VERIFIER_TRIGGERED_BY,
      });
      expect(workflowsManagement.getWorkflowExecution).toHaveBeenCalledWith(executionId, spaceId, {
        includeOutput: true,
      });
    });

    it('polls until the execution reaches a terminal status', async () => {
      workflowsManagement.getWorkflowExecution
        .mockResolvedValueOnce(execution(ExecutionStatus.RUNNING))
        .mockResolvedValueOnce(execution(ExecutionStatus.RUNNING))
        .mockResolvedValueOnce(execution(ExecutionStatus.COMPLETED, { output: { passed: true } }));

      const pending = makeVerifier().verify({}, context);
      await jest.advanceTimersByTimeAsync(WORKFLOW_VERIFIER_POLL_INTERVAL_MS * 2);

      await expect(pending).resolves.toEqual({ passed: true });
      expect(workflowsManagement.getWorkflowExecution).toHaveBeenCalledTimes(3);
    });

    it('passes when the workflow output passed', async () => {
      completed({ passed: true });

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({ passed: true });
    });

    it('fails with the workflow reason', async () => {
      completed({ passed: false, reason: 'has PII' });

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: 'has PII',
      });
    });

    it('fails with a default reason when the workflow gave none', async () => {
      completed({ passed: false });

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: "Verifier workflow 'my-verifier' failed without a reason",
      });
    });

    it('fails on malformed output', async () => {
      completed({ verdict: 'ok' });

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: expect.stringContaining('returned invalid output'),
      });
    });

    it('fails on missing output', async () => {
      workflowsManagement.getWorkflowExecution.mockResolvedValue(
        execution(ExecutionStatus.COMPLETED)
      );

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: expect.stringContaining('returned invalid output'),
      });
    });

    it('fails with the execution error when the workflow failed', async () => {
      workflowsManagement.getWorkflowExecution.mockResolvedValue(
        execution(ExecutionStatus.FAILED, { error: { type: 'Error', message: 'step blew up' } })
      );

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: "Verifier workflow 'my-verifier' failed: step blew up",
      });
    });

    it('fails and cancels when the workflow is waiting for input', async () => {
      workflowsManagement.getWorkflowExecution.mockResolvedValue(
        execution(ExecutionStatus.WAITING_FOR_INPUT)
      );

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: expect.stringContaining('waiting for input'),
      });
      expect(workflowsManagement.cancelWorkflowExecution).toHaveBeenCalledWith(
        executionId,
        spaceId,
        request
      );
    });

    it('fails and cancels the execution on timeout', async () => {
      workflowsManagement.getWorkflowExecution.mockResolvedValue(
        execution(ExecutionStatus.RUNNING)
      );

      const pending = makeVerifier({ timeout_sec: 2 }).verify({}, context);
      await jest.advanceTimersByTimeAsync(2_000);

      await expect(pending).resolves.toEqual({
        passed: false,
        reason: "Verifier workflow 'my-verifier' timed out after 2s",
      });
      expect(workflowsManagement.cancelWorkflowExecution).toHaveBeenCalledWith(
        executionId,
        spaceId,
        request
      );
    });

    it('cancels the execution and rethrows when aborted mid-poll', async () => {
      workflowsManagement.getWorkflowExecution.mockResolvedValue(
        execution(ExecutionStatus.RUNNING)
      );
      const controller = new AbortController();

      const pending = makeVerifier().verify({}, { ...context, abortSignal: controller.signal });
      await jest.advanceTimersByTimeAsync(WORKFLOW_VERIFIER_POLL_INTERVAL_MS / 2);
      controller.abort();

      await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
      expect(workflowsManagement.cancelWorkflowExecution).toHaveBeenCalledWith(
        executionId,
        spaceId,
        request
      );
    });

    it('cancels the execution and rethrows when aborted while a poll is in flight', async () => {
      const controller = new AbortController();
      workflowsManagement.getWorkflowExecution.mockImplementation(async () => {
        controller.abort();
        return execution(ExecutionStatus.RUNNING);
      });

      await expect(
        makeVerifier().verify({}, { ...context, abortSignal: controller.signal })
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(workflowsManagement.getWorkflowExecution).toHaveBeenCalledTimes(1);
      expect(workflowsManagement.cancelWorkflowExecution).toHaveBeenCalledWith(
        executionId,
        spaceId,
        request
      );
    });

    it('truncates long reasons', async () => {
      completed({ passed: false, reason: 'x'.repeat(5000) });

      const outcome = await makeVerifier().verify({}, context);

      expect(outcome.passed).toBe(false);
      expect(outcome.passed === false && outcome.reason.length).toBeLessThan(5000);
    });

    it('propagates executeWorkflow errors and audits the failed run', async () => {
      workflowsManagement.executeWorkflow.mockRejectedValue(new Error('workflow not found'));

      await expect(makeVerifier().verify({}, context)).rejects.toThrow('workflow not found');
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'KI verifier failed to run workflow [id=my-verifier]',
          event: expect.objectContaining({ action: 'workflow_run', outcome: 'failure' }),
          error: { code: 'Error', message: 'workflow not found' },
        })
      );
    });

    it('audits a dispatched run with its execution id', async () => {
      completed({ passed: true });

      await makeVerifier().verify({}, context);

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `KI verifier ran workflow [id=my-verifier] [executionId=${executionId}]`,
          event: expect.objectContaining({ action: 'workflow_run', outcome: 'success' }),
        })
      );
    });

    it('throws before dispatching when already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        makeVerifier().verify({}, { ...context, abortSignal: controller.signal })
      ).rejects.toThrow();
      expect(workflowsManagement.executeWorkflow).not.toHaveBeenCalled();
    });
  });
});
