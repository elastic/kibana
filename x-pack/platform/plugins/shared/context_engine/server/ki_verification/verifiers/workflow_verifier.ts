/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import {
  DEFAULT_KI_VERIFIER_TIMEOUT_SEC,
  type KiVerifierWorkflow,
} from '../../../common/step_types/verify_ki_step';
import type { KiVerifier, KiVerifierOutcome, KnowledgeIndicator } from '../types';

/** Prefix distinguishing workflow verifier ids from built-in ids in the summary. */
export const WORKFLOW_VERIFIER_ID_PREFIX = 'workflow:';

export const WORKFLOW_VERIFIER_TRIGGERED_BY = 'context-engine:verify-ki';

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
    completionTimeoutSec: number;
    triggeredBy: string;
  }): Promise<{
    workflowExecutionId: string;
    execution?: WorkflowExecutionDto;
    timedOut?: boolean;
  }>;
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
}

const fail = (reason: string): KiVerifierOutcome => ({
  passed: false,
  reason: reason.length > MAX_REASON_LENGTH ? `${reason.slice(0, MAX_REASON_LENGTH)}…` : reason,
});

/** Runs a user-authored workflow as a KI verifier, failing closed on any outcome other than a clean pass. */
export const createWorkflowVerifier = (
  { workflow_id: workflowId, timeout_sec: timeoutSec, applies_to: appliesTo }: KiVerifierWorkflow,
  { workflowsManagement, request, spaceId }: WorkflowVerifierDependencies
): KiVerifier => {
  const completionTimeoutSec = timeoutSec ?? DEFAULT_KI_VERIFIER_TIMEOUT_SEC;

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

      const { workflowExecutionId, execution, timedOut } =
        await workflowsManagement.executeWorkflow({
          workflowId,
          inputs: { ki },
          request,
          spaceId,
          waitForCompletion: true,
          completionTimeoutSec,
          triggeredBy: WORKFLOW_VERIFIER_TRIGGERED_BY,
        });

      if (timedOut || !execution) {
        await workflowsManagement.cancelWorkflowExecution(workflowExecutionId, spaceId, request);
        return fail(`Verifier workflow '${workflowId}' timed out after ${completionTimeoutSec}s`);
      }

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
            `Verifier workflow '${workflowId}' failed: ${
              execution.error?.message ?? 'unknown error'
            }`
          );
        case ExecutionStatus.WAITING_FOR_INPUT:
          return fail(
            `Verifier workflow '${workflowId}' is waiting for input; verifier workflows must complete without human input`
          );
        default:
          return fail(`Verifier workflow '${workflowId}' ended with status '${execution.status}'`);
      }
    },
  };
};
