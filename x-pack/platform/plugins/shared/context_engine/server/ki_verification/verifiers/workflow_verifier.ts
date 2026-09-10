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
import { WORKFLOW_VERIFIER_ID_PREFIX } from '../../../common/ki_verification';
import {
  DEFAULT_KI_VERIFIER_TIMEOUT_SEC,
  type KiVerifierWorkflow,
} from '../../../common/step_types/verify_ki_step';
import { isAbortError } from '../../telemetry';
import type { KiVerifier, KiVerifierOutcome, KnowledgeIndicator } from '../types';

export { WORKFLOW_VERIFIER_ID_PREFIX };

export const WORKFLOW_VERIFIER_TRIGGERED_BY = 'context-engine:verify-ki';

export const WORKFLOW_VERIFIER_POLL_INTERVAL_MS = 1_000;

export const MAX_REASON_LENGTH = 2048;

/**
 * How many levels of verifier workflows may nest (a verifier whose own
 * `verifyKi` step runs verifier workflows, and so on). `executeWorkflow`
 * bypasses the engine's event-chain depth guard, so the step enforces this.
 */
export const MAX_KI_VERIFIER_WORKFLOW_DEPTH = 3;

/** Execution metadata carrying the verifier nesting state into child workflows. */
export const KI_VERIFIER_CHAIN_METADATA_KEY = 'ki_verifier_chain';

/** The workflow ids from the outermost caller down to the current workflow, read from execution metadata. */
export const readKiVerifierChain = (metadata: Record<string, unknown> | undefined): string[] => {
  const chain = metadata?.[KI_VERIFIER_CHAIN_METADATA_KEY];
  return Array.isArray(chain) ? chain.filter((id): id is string => typeof id === 'string') : [];
};

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
    metadata?: Record<string, unknown>;
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
  /** Workflow ids from the outermost caller down to the calling workflow; forwarded so nested verifiers can detect cycles. */
  verifierChain: string[];
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
  {
    workflowsManagement,
    request,
    spaceId,
    auditLogger,
    verifierChain,
  }: WorkflowVerifierDependencies
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
    async verify(ki, { abortSignal, logger }) {
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
          metadata: { [KI_VERIFIER_CHAIN_METADATA_KEY]: verifierChain },
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
      // Reasons can echo user data, so only the execution id is logged for tracing.
      const settle = (outcome: KiVerifierOutcome): KiVerifierOutcome => {
        if (!outcome.passed) {
          logger.debug(
            `KI verifier '${workflowId}' did not pass (workflow execution ${workflowExecutionId})`
          );
        }
        return outcome;
      };

      try {
        while (true) {
          abortSignal?.throwIfAborted();
          const execution = await workflowsManagement.getWorkflowExecution(
            workflowExecutionId,
            spaceId,
            { includeOutput: true }
          );
          if (execution && isTerminalStatus(execution.status)) {
            return settle(toOutcome(workflowId, execution));
          }
          if (execution?.status === ExecutionStatus.WAITING_FOR_INPUT) {
            await cancel();
            return settle(toOutcome(workflowId, execution));
          }
          if (Date.now() >= deadline) {
            await cancel();
            return settle(
              fail(`Verifier workflow '${workflowId}' timed out after ${timeoutMs / 1000}s`)
            );
          }
          await sleep(WORKFLOW_VERIFIER_POLL_INTERVAL_MS, abortSignal);
        }
      } catch (error) {
        // `signal.reason` may be a non-Error value, so check the signal itself as well.
        if (isAbortError(error) || abortSignal?.aborted) {
          logger.debug(
            `KI verifier '${workflowId}' aborted (workflow execution ${workflowExecutionId})`
          );
          await cancel();
        }
        throw error;
      }
    },
  };
};
