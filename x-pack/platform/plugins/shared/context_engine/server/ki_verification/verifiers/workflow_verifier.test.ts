/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';
import type { KiVerifierContext } from '../types';
import type { KiVerifierWorkflowRunner } from './workflow_verifier';
import { createWorkflowVerifier, WORKFLOW_VERIFIER_TRIGGERED_BY } from './workflow_verifier';

type ExecuteWorkflowResult = Awaited<ReturnType<KiVerifierWorkflowRunner['executeWorkflow']>>;

const request = { headers: {} } as unknown as KibanaRequest;
const spaceId = 'space-a';

const execution = (
  status: ExecutionStatus,
  overrides: Partial<{ output: unknown; error: { type: string; message: string } }> = {}
): ExecuteWorkflowResult => ({
  workflowExecutionId: 'exec-1',
  execution: {
    status,
    error: overrides.error ?? null,
    context: 'output' in overrides ? { output: overrides.output } : undefined,
  } as unknown as ExecuteWorkflowResult['execution'],
});

describe('createWorkflowVerifier', () => {
  let workflowsManagement: jest.Mocked<KiVerifierWorkflowRunner>;
  let context: KiVerifierContext;

  const makeVerifier = (definition: Partial<Parameters<typeof createWorkflowVerifier>[0]> = {}) =>
    createWorkflowVerifier(
      { workflow_id: 'my-verifier', ...definition },
      { workflowsManagement, request, spaceId }
    );

  beforeEach(() => {
    workflowsManagement = {
      executeWorkflow: jest.fn(),
      cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    };
    context = {
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      logger: loggingSystemMock.createLogger(),
    };
  });

  it('prefixes the id with workflow:', () => {
    expect(makeVerifier().id).toBe('workflow:my-verifier');
  });

  describe('applies', () => {
    it('applies to every KI by default', () => {
      expect(makeVerifier().applies({})).toBe(true);
    });

    it('filters by type', () => {
      const verifier = makeVerifier({ applies_to: { types: ['runbook'] } });

      expect(verifier.applies({ type: 'runbook' })).toBe(true);
      expect(verifier.applies({ type: 'faq' })).toBe(false);
      expect(verifier.applies({})).toBe(false);
    });

    it('filters by attribute keys', () => {
      const verifier = makeVerifier({ applies_to: { attributes: ['esql', 'owner'] } });

      expect(verifier.applies({ attributes: { esql: 'FROM x', owner: 'me' } })).toBe(true);
      expect(verifier.applies({ attributes: { esql: 'FROM x' } })).toBe(false);
    });
  });

  describe('verify', () => {
    it('runs the workflow with the KI as input and waits for completion', async () => {
      workflowsManagement.executeWorkflow.mockResolvedValue(
        execution(ExecutionStatus.COMPLETED, { output: { passed: true } })
      );
      const ki = { type: 'runbook', title: 'x' };

      await makeVerifier({ timeout_sec: 30 }).verify(ki, context);

      expect(workflowsManagement.executeWorkflow).toHaveBeenCalledWith({
        workflowId: 'my-verifier',
        inputs: { ki },
        request,
        spaceId,
        waitForCompletion: true,
        completionTimeoutSec: 30,
        triggeredBy: WORKFLOW_VERIFIER_TRIGGERED_BY,
      });
    });

    it('passes when the workflow output passed', async () => {
      workflowsManagement.executeWorkflow.mockResolvedValue(
        execution(ExecutionStatus.COMPLETED, { output: { passed: true } })
      );

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({ passed: true });
    });

    it('fails with the workflow reason', async () => {
      workflowsManagement.executeWorkflow.mockResolvedValue(
        execution(ExecutionStatus.COMPLETED, { output: { passed: false, reason: 'has PII' } })
      );

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: 'has PII',
      });
    });

    it('fails with a default reason when the workflow gave none', async () => {
      workflowsManagement.executeWorkflow.mockResolvedValue(
        execution(ExecutionStatus.COMPLETED, { output: { passed: false } })
      );

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: "Verifier workflow 'my-verifier' failed without a reason",
      });
    });

    it('fails on malformed output', async () => {
      workflowsManagement.executeWorkflow.mockResolvedValue(
        execution(ExecutionStatus.COMPLETED, { output: { verdict: 'ok' } })
      );

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: expect.stringContaining('returned invalid output'),
      });
    });

    it('fails on missing output', async () => {
      workflowsManagement.executeWorkflow.mockResolvedValue(execution(ExecutionStatus.COMPLETED));

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: expect.stringContaining('returned invalid output'),
      });
    });

    it('fails with the execution error when the workflow failed', async () => {
      workflowsManagement.executeWorkflow.mockResolvedValue(
        execution(ExecutionStatus.FAILED, { error: { type: 'Error', message: 'step blew up' } })
      );

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: "Verifier workflow 'my-verifier' failed: step blew up",
      });
    });

    it('fails when the workflow is waiting for input', async () => {
      workflowsManagement.executeWorkflow.mockResolvedValue(
        execution(ExecutionStatus.WAITING_FOR_INPUT)
      );

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: expect.stringContaining('waiting for input'),
      });
    });

    it('fails and cancels the execution on timeout', async () => {
      workflowsManagement.executeWorkflow.mockResolvedValue({
        workflowExecutionId: 'exec-1',
        timedOut: true,
      });

      await expect(makeVerifier().verify({}, context)).resolves.toEqual({
        passed: false,
        reason: "Verifier workflow 'my-verifier' timed out after 60s",
      });
      expect(workflowsManagement.cancelWorkflowExecution).toHaveBeenCalledWith(
        'exec-1',
        spaceId,
        request
      );
    });

    it('truncates long reasons', async () => {
      workflowsManagement.executeWorkflow.mockResolvedValue(
        execution(ExecutionStatus.COMPLETED, {
          output: { passed: false, reason: 'x'.repeat(5000) },
        })
      );

      const outcome = await makeVerifier().verify({}, context);

      expect(outcome.passed).toBe(false);
      expect(outcome.passed === false && outcome.reason.length).toBeLessThan(5000);
    });

    it('propagates executeWorkflow errors', async () => {
      workflowsManagement.executeWorkflow.mockRejectedValue(new Error('workflow not found'));

      await expect(makeVerifier().verify({}, context)).rejects.toThrow('workflow not found');
    });

    it('throws before running when already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        makeVerifier().verify({}, { ...context, abortSignal: controller.signal })
      ).rejects.toThrow();
      expect(workflowsManagement.executeWorkflow).not.toHaveBeenCalled();
    });
  });
});
