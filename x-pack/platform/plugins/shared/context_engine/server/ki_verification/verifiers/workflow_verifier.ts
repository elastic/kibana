/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AuditEvent, AuditLogger } from '@kbn/core-security-server';
import type {
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus, toWorkflowExecutionEngineModel } from '@kbn/workflows';
import { ExecutionError } from '@kbn/workflows/server';
import { z } from '@kbn/zod/v4';
import { WORKFLOW_VERIFIER_ID_PREFIX } from '../../../common/ki_verification';
import {
  DEFAULT_KI_VERIFIER_TIMEOUT_SEC,
  type KiVerifierWorkflow,
} from '../../../common/step_types/verify_ki_step';
import { errorTypeForTelemetry, isAbortError } from '../../telemetry';
import type { KiVerifier, KiVerifierOutcome, KnowledgeIndicator } from '../types';

export { WORKFLOW_VERIFIER_ID_PREFIX };

export const WORKFLOW_VERIFIER_TRIGGERED_BY = 'context-engine:verify-ki';

export const WORKFLOW_VERIFIER_POLL_INTERVAL_MS = 1_000;

export const MAX_REASON_LENGTH = 2048;

/** Max nesting depth for verifier workflows; enforced here because `runWorkflow` bypasses the engine's depth guard. */
export const MAX_KI_VERIFIER_WORKFLOW_DEPTH = 5;

export const KI_VERIFIER_CHAIN_METADATA_KEY = 'ki_verifier_chain';

/** The workflow ids from the outermost caller down to the current workflow, read from execution metadata. */
export const readKiVerifierChain = (metadata: Record<string, unknown> | undefined): string[] => {
  const chain = metadata?.[KI_VERIFIER_CHAIN_METADATA_KEY];
  return Array.isArray(chain) ? chain.filter((id): id is string => typeof id === 'string') : [];
};

const MAX_LINEAGE_LOOKUPS = 10;

/** Returns the full list of caller workflow ids, outermost first; throws if any parent workflow run record cannot be read. */
export const resolveKiVerifierChain = async ({
  workflowId,
  metadata,
  parent,
  spaceId,
  workflowsManagement,
}: {
  workflowId: string;
  metadata: Record<string, unknown> | undefined;
  parent: { workflowId: string; executionId: string } | undefined;
  spaceId: string;
  workflowsManagement: Pick<KiVerifierWorkflowRunner, 'getWorkflowExecution'>;
}): Promise<string[]> => {
  const lineage: string[] = [];
  let caller = parent;
  for (let lookups = 0; caller; lookups++) {
    if (lookups >= MAX_LINEAGE_LOOKUPS) {
      throw new Error(
        `Cannot resolve the verifier workflow chain for '${workflowId}': more than ${MAX_LINEAGE_LOOKUPS} parent workflows`
      );
    }
    const execution = await workflowsManagement.getWorkflowExecution(caller.executionId, spaceId);
    if (!execution) {
      throw new Error(
        `Cannot resolve the verifier workflow chain for '${workflowId}': parent workflow run '${caller.executionId}' is not readable`
      );
    }
    const context = execution.context ?? {};
    lineage.unshift(
      ...readKiVerifierChain(context.metadata as Record<string, unknown> | undefined),
      caller.workflowId
    );
    const { parentWorkflowId, parentWorkflowExecutionId } = context;
    caller =
      typeof parentWorkflowId === 'string' && typeof parentWorkflowExecutionId === 'string'
        ? { workflowId: parentWorkflowId, executionId: parentWorkflowExecutionId }
        : undefined;
  }
  return [...lineage, ...readKiVerifierChain(metadata), workflowId];
};

const workflowVerifierOutputSchema = z.object({
  passed: z.boolean(),
  reason: z.string().optional(),
});

/** Declared locally to avoid a project reference cycle with the workflows management plugin. */
export interface KiVerifierWorkflowRunner {
  getWorkflow(workflowId: string, spaceId: string): Promise<WorkflowDetailDto | null>;
  runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, unknown>,
    request: KibanaRequest,
    triggeredBy?: string,
    metadata?: Record<string, unknown>
  ): Promise<string>;
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

// Mirrors the composition rules `workflow.execute` applies for an unmanaged parent.
const resolveRunnableWorkflow = async (
  workflowId: string,
  { workflowsManagement, spaceId }: WorkflowVerifierDependencies
): Promise<WorkflowExecutionEngineModel> => {
  const workflow = await workflowsManagement.getWorkflow(workflowId, spaceId);
  if (!workflow) {
    throw new ExecutionError({
      type: 'NotFoundError',
      message: `Verifier workflow '${workflowId}' not found`,
    });
  }
  if (workflow.managed) {
    throw new ExecutionError({
      type: 'InputValidationError',
      message: `Verifier workflow '${workflowId}' is a managed workflow; only unmanaged workflows can run as KI verifiers`,
    });
  }
  if (!workflow.enabled || !workflow.valid || !workflow.definition) {
    throw new ExecutionError({
      type: 'InputValidationError',
      message: `Verifier workflow '${workflowId}' is disabled or invalid and cannot run`,
    });
  }
  return toWorkflowExecutionEngineModel(workflow);
};

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

/** Runs a workflow as a KI verifier; cancels the child execution if the parent is aborted. */
export const createWorkflowVerifier = (
  { workflow_id: workflowId, timeout_sec: timeoutSec, applies_to: appliesTo }: KiVerifierWorkflow,
  dependencies: WorkflowVerifierDependencies
): KiVerifier => {
  const { workflowsManagement, request, spaceId, auditLogger, verifierChain } = dependencies;
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
      const deadline = Date.now() + timeoutMs;

      let workflowExecutionId: string;
      try {
        const workflow = await resolveRunnableWorkflow(workflowId, dependencies);
        abortSignal?.throwIfAborted();
        workflowExecutionId = await workflowsManagement.runWorkflow(
          workflow,
          spaceId,
          { ki },
          request,
          WORKFLOW_VERIFIER_TRIGGERED_BY,
          { [KI_VERIFIER_CHAIN_METADATA_KEY]: verifierChain }
        );
      } catch (error) {
        auditLogger?.log(workflowRunAuditEvent(workflowId, { error }));
        throw error;
      }
      auditLogger?.log(workflowRunAuditEvent(workflowId, { executionId: workflowExecutionId }));
      const cancel = () =>
        workflowsManagement
          .cancelWorkflowExecution(workflowExecutionId, spaceId, request)
          .catch(() => undefined);
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
          let execution: WorkflowExecutionDto | null;
          try {
            execution = await workflowsManagement.getWorkflowExecution(
              workflowExecutionId,
              spaceId,
              { includeOutput: true }
            );
          } catch (error) {
            // Execution documents can lag or reads can blip; keep polling until the deadline.
            logger.debug(
              `KI verifier '${workflowId}' poll failed: ${errorTypeForTelemetry(
                error
              )} (workflow execution ${workflowExecutionId})`
            );
            execution = null;
          }
          abortSignal?.throwIfAborted();
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
