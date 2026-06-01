/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionStaleResumeError,
} from '@kbn/workflows/common/errors';
import { AgentPromptType, isFormPrompt } from '@kbn/agent-builder-common/agents/prompts';
import type {
  FormPromptRequest,
  FormPromptResponse,
} from '@kbn/agent-builder-common/agents/prompts';
import { ConversationRoundStatus, ConversationRoundStepType } from '@kbn/agent-builder-common';
import type {
  ConversationRound,
  OtherStep,
  StaleSubmissionReason,
} from '@kbn/agent-builder-common';
import { HITL_EVENT_TYPES, reportHitlEvent } from '@kbn/workflows-hitl-telemetry';
import type { HitlAnalytics } from '@kbn/workflows-hitl-telemetry';
import { ExecutionStatus } from '@kbn/workflows';
import { getExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import type { WorkflowExecutionState } from '@kbn/agent-builder-tools-base/workflows';
import type { ConversationClient } from '../../../conversation';
import { pollForWorkflowAdvance } from './poll_for_workflow_advance';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

/**
 * Builds a FormPromptRequest for the NEXT waitForInput step when the observed
 * execution has advanced past the submitted step.
 */
const buildNextFormPrompt = ({
  executionId,
  observedExecution,
  previousStepExecutionId,
}: {
  executionId: string;
  observedExecution: WorkflowExecutionState;
  previousStepExecutionId: string | undefined;
}): FormPromptRequest | undefined => {
  if (observedExecution.status !== ExecutionStatus.WAITING_FOR_INPUT) return undefined;
  const wi = observedExecution.waiting_input;
  if (!wi) return undefined;
  if (wi.step_execution_id === previousStepExecutionId) return undefined;
  return {
    execution_id: executionId,
    id: wi.step_execution_id,
    message: wi.message ?? '',
    resume_seq: typeof observedExecution.resume_seq === 'number' ? observedExecution.resume_seq : 0,
    schema: wi.schema ?? {},
    step_execution_id: wi.step_execution_id,
    type: AgentPromptType.form,
    ...(wi.agent_context !== undefined ? { agent_context: wi.agent_context } : {}),
  };
};

/**
 * Result returned to callers. `kind: 'resumed'` means CAS won and the workflow
 * was successfully resumed. `kind: 'stale'` means CAS lost — another submission
 * already advanced the execution and this submission was ignored.
 */
export type HandleFormPromptOutcome =
  | {
      kind: 'resumed';
      /** FormPromptRequest for the next waitForInput step, if the workflow advanced to one. */
      nextFormPrompt?: FormPromptRequest;
      observedExecution: WorkflowExecutionState | null;
      observedStatus: string;
    }
  | {
      kind: 'stale';
      /** FormPromptRequest for the next waitForInput step, populated when the workflow advanced past the submitted step. */
      nextFormPrompt?: FormPromptRequest;
      /** The execution state observed after the CAS failure, passed to refreshStaleWorkflowExecution so the LLM receives the correct step context. */
      observedExecution: WorkflowExecutionState | null;
      reason: StaleSubmissionReason;
      observedStatus: string;
    };

export interface HandleFormPromptParams {
  analytics?: HitlAnalytics;
  conversationClient?: ConversationClient;
  conversationId?: string;
  formPromptResponse: FormPromptResponse;
  logger?: Logger;
  request: KibanaRequest;
  spaceId: string;
  workflowApi: WorkflowApi;
}

interface RoundContext {
  matchingPrompt: FormPromptRequest;
  round: ConversationRound;
  roundIndex: number;
  rounds: ConversationRound[];
  stepExecutionId: string;
}

const findRoundContext = async ({
  conversationClient,
  conversationId,
  executionId,
}: {
  conversationClient: ConversationClient;
  conversationId: string;
  executionId: string;
}): Promise<RoundContext | undefined> => {
  const conversation = await conversationClient.get(conversationId);
  const { rounds } = conversation;

  const roundIndex = rounds.findLastIndex((round) =>
    round.pending_prompts?.some((p) => isFormPrompt(p) && p.execution_id === executionId)
  );
  if (roundIndex === -1) return undefined;

  const round = rounds[roundIndex];
  const matchingPromptRaw = round.pending_prompts?.find(
    (p) => isFormPrompt(p) && p.execution_id === executionId
  );
  if (!matchingPromptRaw || !isFormPrompt(matchingPromptRaw)) return undefined;

  return {
    matchingPrompt: matchingPromptRaw,
    round,
    roundIndex,
    rounds,
    stepExecutionId: matchingPromptRaw.step_execution_id,
  };
};

const buildAuditStep = ({
  executionId,
  stepExecutionId,
  matchingPrompt,
  values,
  stale,
  observedStatus,
}: {
  executionId: string;
  stepExecutionId: string;
  matchingPrompt: FormPromptRequest;
  values: Record<string, unknown>;
  stale?: { reason: StaleSubmissionReason };
  observedStatus: string;
}): OtherStep =>
  stale
    ? {
        ...(matchingPrompt.agent_context !== undefined && {
          agent_context: matchingPrompt.agent_context,
        }),
        execution_id: executionId,
        kind: 'hitl_form_response_stale',
        ...(matchingPrompt.message !== undefined && { message: matchingPrompt.message }),
        observed_status: observedStatus,
        reason: stale.reason,
        ...(matchingPrompt.schema !== undefined && { schema: matchingPrompt.schema }),
        step_execution_id: stepExecutionId,
        submitted_at: new Date().toISOString(),
        submitted_values: values,
        type: ConversationRoundStepType.other,
      }
    : {
        ...(matchingPrompt.agent_context !== undefined && {
          agent_context: matchingPrompt.agent_context,
        }),
        execution_id: executionId,
        kind: 'hitl_form_response',
        ...(matchingPrompt.message !== undefined && { message: matchingPrompt.message }),
        ...(matchingPrompt.schema !== undefined && { schema: matchingPrompt.schema }),
        step_execution_id: stepExecutionId,
        submitted_at: new Date().toISOString(),
        type: ConversationRoundStepType.other,
        values,
      };

/**
 * Persists the form submission as a step on the round that owned the prompt,
 * and seals that round so the next chat-agent run starts a NEW round (clean
 * prose ordering by construction).
 *
 * On success: round.status -> completed, pending_prompts cleared, audit step appended.
 * On stale: round.status left as awaitingPrompt (user may retry); stale audit step appended.
 */
const persistSubmission = async ({
  conversationClient,
  conversationId,
  roundContext,
  auditStep,
  sealRound,
}: {
  conversationClient: ConversationClient;
  conversationId: string;
  roundContext: RoundContext;
  auditStep: OtherStep;
  sealRound: boolean;
}): Promise<void> => {
  const { round, roundIndex, rounds, stepExecutionId } = roundContext;
  const remainingPendingPrompts = (round.pending_prompts ?? []).filter(
    (p) => p.id !== stepExecutionId
  );
  const updatedRound: ConversationRound = sealRound
    ? {
        ...round,
        status:
          remainingPendingPrompts.length > 0
            ? ConversationRoundStatus.awaitingPrompt
            : ConversationRoundStatus.completed,
        pending_prompts: remainingPendingPrompts.length > 0 ? remainingPendingPrompts : undefined,
        steps: [...round.steps, auditStep],
      }
    : {
        ...round,
        steps: [...round.steps, auditStep],
      };

  const updatedRounds = [
    ...rounds.slice(0, roundIndex),
    updatedRound,
    ...rounds.slice(roundIndex + 1),
  ];
  await conversationClient.update({ id: conversationId, rounds: updatedRounds });
};

export const handleFormPromptResponse = async ({
  analytics,
  conversationClient,
  conversationId,
  formPromptResponse: { execution_id, values },
  logger,
  request,
  spaceId,
  workflowApi,
}: HandleFormPromptParams): Promise<HandleFormPromptOutcome> => {
  logger?.debug(
    () => `[hitl-debug][ab] handleForm.start exec=${execution_id} seq=(none) stepId=(none)`
  );

  // Backward-compat shim: callers without conversation context (e.g. direct API resume)
  // skip the CAS / audit path. readAgentBuilder is the intended privilege gate at the
  // route level; missing execute privilege here is deliberate — space-scoping and the
  // execution UUID are the authorization controls for this path.
  if (!conversationClient || !conversationId) {
    await workflowApi.resumeWorkflowExecution(execution_id, spaceId, values, request);
    reportHitlEvent(analytics, undefined, HITL_EVENT_TYPES.responded, {
      execution_id,
      source_app: 'agent_builder',
      responseSource: 'chat',
    });
    return { kind: 'resumed', observedExecution: null, observedStatus: 'unknown' };
  }

  const roundContext = await findRoundContext({
    conversationClient,
    conversationId,
    executionId: execution_id,
  });
  if (!roundContext) {
    // Prompt no longer in any round's pending_prompts (e.g. already cleared by
    // another submission). Treat as stale — no resume call.
    logger?.debug(
      () =>
        `[hitl-debug][ab] handleForm.earlyReturn exec=${execution_id} seq=(none) stepId=(none) reason=not_in_pending_prompts`
    );
    return {
      kind: 'stale',
      observedExecution: null,
      reason: 'concurrent_resume',
      observedStatus: 'unknown',
    };
  }

  const { matchingPrompt, stepExecutionId } = roundContext;
  // resume_seq is guarded by typeof===number so a missing/null value yields
  // undefined (not NaN). Conversations created before Stage-1 (no resume_seq
  // on the prompt) resume via the non-CAS path (expectedResumeSeq=undefined) —
  // forward-compat: new deploys generating seq=0 prompts work without backfill.
  const expectedResumeSeq =
    typeof matchingPrompt.resume_seq === 'number' ? matchingPrompt.resume_seq + 1 : undefined;
  const promptSeq = matchingPrompt.resume_seq ?? '(none)';

  logger?.debug(
    () =>
      `[hitl-debug][ab] classify.preCheck.state exec=${execution_id} seq=${promptSeq} stepId=${stepExecutionId} expectedResumeSeq=${
        expectedResumeSeq ?? '(none)'
      }`
  );

  try {
    logger?.debug(
      () =>
        `[hitl-debug][ab] resume.workflowApi.call exec=${execution_id} seq=${promptSeq} stepId=${stepExecutionId} expectedResumeSeq=${
          expectedResumeSeq ?? '(none)'
        }`
    );
    await workflowApi.resumeWorkflowExecution(
      execution_id,
      spaceId,
      values,
      request,
      expectedResumeSeq !== undefined ? { expectedResumeSeq } : undefined
    );
    logger?.debug(
      () =>
        `[hitl-debug][ab] resume.workflowApi.return exec=${execution_id} seq=${promptSeq} stepId=${stepExecutionId} ok=true`
    );
  } catch (err) {
    // Both WorkflowExecutionStaleResumeError (CAS lost — another caller won the race
    // while the execution was still WAITING_FOR_INPUT) and
    // WorkflowExecutionInvalidStatusError (the execution already advanced past
    // WAITING_FOR_INPUT before our resume arrived — "Window 2" race: TaskManager
    // already materialized the terminal step) represent the same logical outcome:
    // our submission is stale. Route both through the same stale-handling path.
    if (
      err instanceof WorkflowExecutionStaleResumeError ||
      err instanceof WorkflowExecutionInvalidStatusError
    ) {
      const errName =
        err instanceof WorkflowExecutionStaleResumeError
          ? 'WorkflowExecutionStaleResumeError'
          : 'WorkflowExecutionInvalidStatusError';
      logger?.debug(
        () =>
          `[hitl-debug][ab] resume.workflowApi.return exec=${execution_id} seq=${promptSeq} stepId=${stepExecutionId} ok=false reason=${errName}`
      );
      logger?.debug(
        () =>
          `[hitl-debug][ab] classify.result exec=${execution_id} seq=${promptSeq} stepId=${stepExecutionId} kind=stale`
      );
      // Poll to see if the workflow advanced to a new step (S5/S6: CAS-fail but
      // concurrent submitter advanced the workflow — we may still get the next form).
      const observedExecution = logger
        ? await pollForWorkflowAdvance({
            executionId: execution_id,
            logger,
            previousStepExecutionId: stepExecutionId,
            spaceId,
            workflowApi,
          })
        : await getExecutionState({ executionId: execution_id, spaceId, workflowApi });
      logger?.debug(
        () =>
          `[hitl-debug][ab] stale.observedExecution exec=${execution_id} seq=${promptSeq} stepId=${
            observedExecution?.waiting_input?.step_execution_id ?? 'none'
          } status=${observedExecution?.status ?? 'null'}`
      );
      const observedStepExecutionId = observedExecution?.waiting_input?.step_execution_id;
      const reason: StaleSubmissionReason =
        observedExecution && observedExecution.status !== 'waiting_for_input'
          ? 'workflow_already_resolved'
          : observedStepExecutionId !== undefined && observedStepExecutionId !== stepExecutionId
          ? 'workflow_advanced'
          : 'concurrent_resume';
      const nextFormPrompt =
        observedExecution !== null
          ? buildNextFormPrompt({
              executionId: execution_id,
              observedExecution,
              previousStepExecutionId: stepExecutionId,
            })
          : undefined;
      if (nextFormPrompt) {
        logger?.debug(
          () =>
            `[hitl-debug][ab] nextPrompt.build exec=${execution_id} seq=${nextFormPrompt.resume_seq} stepId=${nextFormPrompt.step_execution_id} fromPath=stale`
        );
      } else {
        logger?.debug(
          () =>
            `[hitl-debug][ab] nextPrompt.skip exec=${execution_id} seq=${promptSeq} stepId=${stepExecutionId} fromPath=stale reason=${
              observedExecution === null
                ? 'observedNull'
                : observedExecution.status !== ExecutionStatus.WAITING_FOR_INPUT
                ? 'notWaiting'
                : 'sameStep'
            }`
        );
      }
      logger?.debug(
        () =>
          `[hitl-debug][ab] audit.stale.append exec=${execution_id} seq=${promptSeq} stepId=${stepExecutionId} reason=${reason}`
      );
      await persistSubmission({
        conversationClient,
        conversationId,
        roundContext,
        auditStep: buildAuditStep({
          executionId: execution_id,
          stepExecutionId,
          matchingPrompt,
          values,
          stale: { reason },
          observedStatus: observedExecution?.status ?? 'unknown',
        }),
        // Seal when the workflow already advanced: sets status=completed so
        // run_chat_agent recognises this as a sealed form-submission round and
        // resumes graph execution rather than starting a new conversation turn.
        sealRound: reason === 'workflow_already_resolved' || reason === 'workflow_advanced',
      });
      return {
        kind: 'stale',
        nextFormPrompt,
        observedExecution: observedExecution ?? null,
        reason,
        observedStatus: observedExecution?.status ?? 'unknown',
      };
    }
    throw err;
  }

  logger?.debug(
    () =>
      `[hitl-debug][ab] classify.result exec=${execution_id} seq=${promptSeq} stepId=${stepExecutionId} kind=fresh`
  );

  reportHitlEvent(analytics, undefined, HITL_EVENT_TYPES.responded, {
    execution_id,
    source_app: 'agent_builder',
    responseSource: 'chat',
  });

  logger?.debug(
    () =>
      `[hitl-debug][ab] audit.fresh.append exec=${execution_id} seq=${promptSeq} stepId=${stepExecutionId}`
  );
  await persistSubmission({
    conversationClient,
    conversationId,
    roundContext,
    auditStep: buildAuditStep({
      executionId: execution_id,
      stepExecutionId,
      matchingPrompt,
      values,
      observedStatus: 'resumed',
    }),
    // sealRound=true sets the round's status to completed before the follow-up
    // chat-agent run so run_chat_agent detects it as a sealed form-submission
    // round (status=completed + hitl_form_response step) and resumes from the
    // correct graph point rather than starting a new turn. This is also the
    // architectural fix for chronological prose-vs-form rendering.
    sealRound: true,
  });

  // Poll until the TaskManager task materializes the next workflow state (R1 fix).
  const observedExecution = logger
    ? await pollForWorkflowAdvance({
        executionId: execution_id,
        logger,
        previousStepExecutionId: stepExecutionId,
        spaceId,
        workflowApi,
      })
    : await getExecutionState({ executionId: execution_id, spaceId, workflowApi });
  logger?.debug(
    () =>
      `[hitl-debug][ab] fresh.observedExecution exec=${execution_id} seq=${promptSeq} stepId=${
        observedExecution?.waiting_input?.step_execution_id ?? 'none'
      } status=${observedExecution?.status ?? 'null'}`
  );
  const nextFormPrompt =
    observedExecution !== null
      ? buildNextFormPrompt({
          executionId: execution_id,
          observedExecution,
          previousStepExecutionId: stepExecutionId,
        })
      : undefined;
  if (nextFormPrompt) {
    logger?.debug(
      () =>
        `[hitl-debug][ab] nextPrompt.build exec=${execution_id} seq=${nextFormPrompt.resume_seq} stepId=${nextFormPrompt.step_execution_id} fromPath=fresh`
    );
  } else {
    logger?.debug(
      () =>
        `[hitl-debug][ab] nextPrompt.skip exec=${execution_id} seq=${promptSeq} stepId=${stepExecutionId} fromPath=fresh reason=${
          observedExecution === null
            ? 'observedNull'
            : observedExecution.status !== ExecutionStatus.WAITING_FOR_INPUT
            ? 'notWaiting'
            : 'sameStep'
        }`
    );
  }
  return {
    kind: 'resumed',
    nextFormPrompt,
    observedExecution,
    observedStatus: observedExecution?.status ?? 'unknown',
  };
};
