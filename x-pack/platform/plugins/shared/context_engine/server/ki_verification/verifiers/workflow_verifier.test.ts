/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/core-security-server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowDetailDto, WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { KiVerifierContext } from '../types';
import type { KiVerifierWorkflowRunner } from './workflow_verifier';
import {
  createWorkflowVerifier,
  resolveKiVerifierChain,
  MAX_REASON_LENGTH,
  WORKFLOW_VERIFIER_POLL_INTERVAL_MS,
  WORKFLOW_VERIFIER_TRIGGERED_BY,
} from './workflow_verifier';

describe('resolveKiVerifierChain', () => {
  const spaceId = 'space-a';
  let getWorkflowExecution: jest.Mock;

  const execWith = (context: Record<string, unknown>) =>
    ({ context } as unknown as WorkflowExecutionDto);

  beforeEach(() => {
    getWorkflowExecution = jest.fn();
  });

  const resolve = (args: {
    metadata?: Record<string, unknown>;
    parent?: { workflowId: string; executionId: string };
  }) =>
    resolveKiVerifierChain({
      workflowId: 'me',
      metadata: args.metadata,
      parent: args.parent,
      spaceId,
      workflowsManagement: { getWorkflowExecution },
    });

  it('is just the current workflow when nothing led here', async () => {
    await expect(resolve({})).resolves.toEqual(['me']);
    expect(getWorkflowExecution).not.toHaveBeenCalled();
  });

  it('reads caller workflow ids from metadata and appends the current workflow', async () => {
    await expect(resolve({ metadata: { ki_verifier_chain: ['a', 'b'] } })).resolves.toEqual([
      'a',
      'b',
      'me',
    ]);
  });

  it('looks up parent workflow run records to reconstruct the full caller list', async () => {
    getWorkflowExecution
      .mockResolvedValueOnce(
        execWith({ parentWorkflowId: 'grand', parentWorkflowExecutionId: 'grand-exec' })
      )
      .mockResolvedValueOnce(execWith({ metadata: { ki_verifier_chain: ['root'] } }));

    await expect(
      resolve({ parent: { workflowId: 'dad', executionId: 'dad-exec' } })
    ).resolves.toEqual(['root', 'grand', 'dad', 'me']);
    expect(getWorkflowExecution).toHaveBeenNthCalledWith(1, 'dad-exec', spaceId);
    expect(getWorkflowExecution).toHaveBeenNthCalledWith(2, 'grand-exec', spaceId);
  });

  it('throws when a parent workflow run record cannot be found', async () => {
    getWorkflowExecution.mockResolvedValue(null);

    await expect(
      resolve({ parent: { workflowId: 'dad', executionId: 'dad-exec' } })
    ).rejects.toThrow("parent workflow run 'dad-exec' is not readable");
  });

  it('throws when there are too many parent workflows to trace', async () => {
    getWorkflowExecution.mockImplementation(async (id: string) =>
      execWith({ parentWorkflowId: `wf-${id}`, parentWorkflowExecutionId: `${id}x` })
    );

    await expect(resolve({ parent: { workflowId: 'dad', executionId: 'e' } })).rejects.toThrow(
      'more than 10 parent workflows'
    );
  });
});

const request = { headers: {} } as unknown as KibanaRequest;
const spaceId = 'space-a';
const executionId = 'exec-1';

const workflowDto = (overrides: Partial<WorkflowDetailDto> = {}): WorkflowDetailDto =>
  ({
    id: 'my-verifier',
    name: 'my-verifier',
    enabled: true,
    valid: true,
    managed: false,
    definition: { name: 'my-verifier', triggers: [{ type: 'manual' }], steps: [] },
    yaml: '',
    ...overrides,
  } as unknown as WorkflowDetailDto);

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
      { workflowsManagement, request, spaceId, auditLogger, verifierChain: ['parent-wf'] }
    );

  beforeEach(() => {
    jest.useFakeTimers();
    auditLogger = { log: jest.fn(), enabled: true, includeSavedObjectNames: false };
    workflowsManagement = {
      getWorkflow: jest.fn().mockResolvedValue(workflowDto()),
      runWorkflow: jest.fn().mockResolvedValue(executionId),
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

      expect(workflowsManagement.getWorkflow).toHaveBeenCalledWith('my-verifier', spaceId);
      expect(workflowsManagement.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'my-verifier' }),
        spaceId,
        { ki },
        request,
        WORKFLOW_VERIFIER_TRIGGERED_BY,
        { ki_verifier_chain: ['parent-wf'] }
      );
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

    it('passes when the workflow reports passed: true', async () => {
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

    it('truncates long reasons to the cap plus an ellipsis', async () => {
      completed({ passed: false, reason: 'x'.repeat(MAX_REASON_LENGTH * 2) });

      const outcome = await makeVerifier().verify({}, context);

      expect(outcome).toEqual({ passed: false, reason: `${'x'.repeat(MAX_REASON_LENGTH)}…` });
    });

    it.each([ExecutionStatus.CANCELLED, ExecutionStatus.TIMED_OUT])(
      'fails when the workflow ended with status %s',
      async (status) => {
        workflowsManagement.getWorkflowExecution.mockResolvedValue(execution(status));

        await expect(makeVerifier().verify({}, context)).resolves.toEqual({
          passed: false,
          reason: `Verifier workflow 'my-verifier' ended with status '${status}'`,
        });
      }
    );

    it('keeps polling when the execution status is not yet available', async () => {
      workflowsManagement.getWorkflowExecution
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(execution(ExecutionStatus.COMPLETED, { output: { passed: true } }));

      const pending = makeVerifier().verify({}, context);
      await jest.advanceTimersByTimeAsync(WORKFLOW_VERIFIER_POLL_INTERVAL_MS);

      await expect(pending).resolves.toEqual({ passed: true });
    });

    it('retries polling after a read error instead of cancelling the running workflow', async () => {
      workflowsManagement.getWorkflowExecution
        .mockRejectedValueOnce(new Error('search failed'))
        .mockResolvedValueOnce(execution(ExecutionStatus.COMPLETED, { output: { passed: true } }));

      const pending = makeVerifier().verify({}, context);
      await jest.advanceTimersByTimeAsync(WORKFLOW_VERIFIER_POLL_INTERVAL_MS);

      await expect(pending).resolves.toEqual({ passed: true });
      expect(workflowsManagement.cancelWorkflowExecution).not.toHaveBeenCalled();
      expect(context.logger.debug).toHaveBeenCalledWith(
        `KI verifier 'my-verifier' poll failed: Error (workflow execution ${executionId})`
      );
    });

    it('cancels and rethrows when aborted during a poll that returns a terminal result', async () => {
      const controller = new AbortController();
      workflowsManagement.getWorkflowExecution.mockImplementation(async () => {
        controller.abort();
        return execution(ExecutionStatus.COMPLETED, { output: { passed: true } });
      });

      await expect(
        makeVerifier().verify({}, { ...context, abortSignal: controller.signal })
      ).rejects.toMatchObject({ name: 'AbortError' });
      expect(workflowsManagement.cancelWorkflowExecution).toHaveBeenCalledWith(
        executionId,
        spaceId,
        request
      );
    });

    it('throws a not-found error when the workflow does not exist', async () => {
      workflowsManagement.getWorkflow.mockResolvedValue(null);

      const thrown = await makeVerifier()
        .verify({}, context)
        .catch((error) => error);

      expect(thrown.type).toBe('NotFoundError');
      expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
      );
    });

    it('refuses to run a managed workflow', async () => {
      workflowsManagement.getWorkflow.mockResolvedValue(workflowDto({ managed: true }));

      const thrown = await makeVerifier()
        .verify({}, context)
        .catch((error) => error);

      expect(thrown.type).toBe('InputValidationError');
      expect(thrown.message).toContain('is a managed workflow');
      expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
    });

    it.each([{ enabled: false }, { valid: false }, { definition: null }])(
      'refuses to run a workflow that is %o',
      async (overrides) => {
        workflowsManagement.getWorkflow.mockResolvedValue(workflowDto(overrides));

        const thrown = await makeVerifier()
          .verify({}, context)
          .catch((error) => error);

        expect(thrown.type).toBe('InputValidationError');
        expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
      }
    );

    it('cancels the execution when aborted with a string reason instead of an Error', async () => {
      workflowsManagement.getWorkflowExecution.mockResolvedValue(
        execution(ExecutionStatus.RUNNING)
      );
      const controller = new AbortController();

      const pending = makeVerifier().verify({}, { ...context, abortSignal: controller.signal });
      await jest.advanceTimersByTimeAsync(WORKFLOW_VERIFIER_POLL_INTERVAL_MS / 2);
      controller.abort('shutting down');

      await expect(pending).rejects.toBe('shutting down');
      expect(workflowsManagement.cancelWorkflowExecution).toHaveBeenCalledWith(
        executionId,
        spaceId,
        request
      );
    });

    it('logs the execution id at debug when the verifier does not pass', async () => {
      completed({ passed: false, reason: 'has PII' });

      await makeVerifier().verify({}, context);

      expect(context.logger.debug).toHaveBeenCalledWith(
        `KI verifier 'my-verifier' did not pass (workflow execution ${executionId})`
      );
    });

    it('throws and writes a failure audit event when the workflow cannot be started', async () => {
      workflowsManagement.runWorkflow.mockRejectedValue(new Error('workflow not found'));

      await expect(makeVerifier().verify({}, context)).rejects.toThrow('workflow not found');
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'KI verifier failed to run workflow [id=my-verifier]',
          event: expect.objectContaining({ action: 'workflow_run', outcome: 'failure' }),
          error: { code: 'Error', message: 'workflow not found' },
        })
      );
    });

    it('writes a success audit event with the execution id after starting the workflow', async () => {
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
      expect(workflowsManagement.runWorkflow).not.toHaveBeenCalled();
    });
  });
});
