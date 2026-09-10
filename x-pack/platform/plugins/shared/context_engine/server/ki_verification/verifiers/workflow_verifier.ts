/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AuditEvent, AuditLogger } from '@kbn/core-security-server';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import {
  DEFAULT_KI_VERIFIER_TIMEOUT_SEC,
  type KiVerifierWorkflow,
} from '../../../common/step_types/verify_ki_step';
import { isAbortError } from '../../telemetry';
import type { KiVerifier, KiVerifierOutcome, KnowledgeIndicator } from '../types';

/** Prefix distinguishing workflow verifier ids from built-in ids in the summary. */
export const WORKFLOW_VERIFIER_ID_PREFIX = 'workflow:';

export const WORKFLOW_VERIFIER_TRIGGERED_BY = 'context-engine:verify-ki';

export const WORKFLOW_VERIFIER_POLL_INTERVAL_MS = 1_000;

const MAX_REASON_LENGTH = 2048;

const workflowVerifierOutputSchema = z.object({
  passed: z.boolean(),
  reason: z.string().optional(),
});

/**
 * The subset of the workflows management API a workflow verifier needs. Declared
 * locally because this plugin cannot reference the workflows management plugin's
 * types without a project reference cycle.
 */
export interface KiVerifierWorkflowRunner {
  executeWorkflow(params: {
    workflowId: string;
    inputs: Record<string, unknown>;
    request: KibanaRequest;
    spaceId: string;
    waitForCompletion: boolean;
    triggeredBy: string;
  }): Promise<{ workflowExecutionId: string }>;
  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    options?: { includeOutput?: boolean }
  ): Promise<WorkflowExecutionDto | null>;
  cancelWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void>;
}

export interface WorkflowVerifierDependencies {
  workflowsManagement: KiVerifierWorkflowRunner;
  request: KibanaRequest;
  spaceId: string;
  /** Records each verifier workflow run, mirroring the workflow run HTTP route's audit event. */
  auditLogger?: AuditLogger;
}

/** Audit action id shared with the workflows management run route. */
export const WORKFLOW_RUN_AUDIT_ACTION = 'workflow_run';

const workflowRunAuditEvent = (
  workflowId: string,
  { executionId, error }: { executionId?: string; error?: unknown }
): AuditEvent => ({
  message:
    error !== undefined
      ? `KI verifier failed to run workflow [id=${workflowId}]`
      : `KI verifier ran workflow [id=${workflowId}] [executionId=${executionId}]`,
  event: {
    action: WORKFLOW_RUN_AUDIT_ACTION,
    category: ['database'],
    type: ['change'],
    outcome: error !== undefined ? 'failure' : 'success',
  },
  ...(error !== undefined && {
    error:
      error instanceof Error
        ? { code: error.name, message: error.message }
        : { code: 'Unknown', message: String(error) },
  }),
});

const fail = (reason: string): KiVerifierOutcome => ({
  passed: false,
  reason: reason.length > MAX_REASON_LENGTH ? `${reason.slice(0, MAX_REASON_LENGTH)}…` : reason,
});

/** Resolves after `ms`, or rejects with the signal's reason as soon as (or if already) aborted. */
const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

const toOutcome = (workflowId: string, execution: WorkflowExecutionDto): KiVerifierOutcome => {
  switch (execution.status) {
    case ExecutionStatus.COMPLETED: {
      const parsed = workflowVerifierOutputSchema.safeParse(execution.context?.output);
      if (!parsed.success) {
        return fail(
          `Verifier workflow '${workflowId}' returned invalid output; expected { passed: boolean, reason?: string }`
        );
      }
      if (parsed.data.passed) {
        return { passed: true };
      }
      return fail(
        parsed.data.reason ?? `Verifier workflow '${workflowId}' failed without a reason`
      );
    }
    case ExecutionStatus.FAILED:
      return fail(
        `Verifier workflow '${workflowId}' failed: ${execution.error?.message ?? 'unknown error'}`
      );
    case ExecutionStatus.WAITING_FOR_INPUT:
      return fail(
        `Verifier workflow '${workflowId}' is waiting for input; verifier workflows must complete without human input`
      );
    default:
      return fail(`Verifier workflow '${workflowId}' ended with status '${execution.status}'`);
  }
};

/**
 * Runs a user-authored workflow as a KI verifier, failing closed on any outcome
 * other than a clean pass. The child execution is polled with the step's abort
 * signal, so cancelling the parent cancels the child and rethrows promptly.
 */
export const createWorkflowVerifier = (
  { workflow_id: workflowId, timeout_sec: timeoutSec, applies_to: appliesTo }: KiVerifierWorkflow,
  { workflowsManagement, request, spaceId, auditLogger }: WorkflowVerifierDependencies
): KiVerifier => {
  const timeoutMs = (timeoutSec ?? DEFAULT_KI_VERIFIER_TIMEOUT_SEC) * 1000;

  return {
    id: `${WORKFLOW_VERIFIER_ID_PREFIX}${workflowId}`,
    applies: (ki: KnowledgeIndicator) => {
      const matchesType = !appliesTo?.types || (!!ki.type && appliesTo.types.includes(ki.type));
      const matchesAttributes =
        !appliesTo?.attributes ||
        appliesTo.attributes.every((key) => ki.attributes?.[key] !== undefined);
      return matchesType && matchesAttributes;
    },
    async verify(ki, { abortSignal }) {
      abortSignal?.throwIfAborted();

      let workflowExecutionId: string;
      try {
        ({ workflowExecutionId } = await workflowsManagement.executeWorkflow({
          workflowId,
          inputs: { ki },
          request,
          spaceId,
          waitForCompletion: false,
          triggeredBy: WORKFLOW_VERIFIER_TRIGGERED_BY,
        }));
      } catch (error) {
        auditLogger?.log(workflowRunAuditEvent(workflowId, { error }));
        throw error;
      }
      auditLogger?.log(workflowRunAuditEvent(workflowId, { executionId: workflowExecutionId }));
      const cancel = () =>
        workflowsManagement
          .cancelWorkflowExecution(workflowExecutionId, spaceId, request)
          .catch(() => undefined);
      const deadline = Date.now() + timeoutMs;

      try {
        while (true) {
          abortSignal?.throwIfAborted();
          const execution = await workflowsManagement.getWorkflowExecution(
            workflowExecutionId,
            spaceId,
            { includeOutput: true }
          );
          if (execution && isTerminalStatus(execution.status)) {
            return toOutcome(workflowId, execution);
          }
          if (execution?.status === ExecutionStatus.WAITING_FOR_INPUT) {
            await cancel();
            return toOutcome(workflowId, execution);
          }
          if (Date.now() >= deadline) {
            await cancel();
            return fail(`Verifier workflow '${workflowId}' timed out after ${timeoutMs / 1000}s`);
          }
          await sleep(WORKFLOW_VERIFIER_POLL_INTERVAL_MS, abortSignal);
        }
      } catch (error) {
        if (isAbortError(error)) {
          await cancel();
        }
        throw error;
      }
    },
  };
};
