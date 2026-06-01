/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { ConverseInput } from '@kbn/agent-builder-common';
import { isFormPrompt } from '@kbn/agent-builder-common/agents/prompts';
import type { FormPromptResponse } from '@kbn/agent-builder-common/agents/prompts';
import type { AgentExecutionService } from '@kbn/agent-builder-server/execution';
import type { ResumedExecutionState } from '@kbn/agent-builder-server/execution';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { ConversationClient } from '../../../services/conversation';
import { handleFormPromptResponse } from '../../../services/execution/runner/utils/handle_form_prompt';
import { resumeInnerWorkflow } from '../resume_inner_workflow';
import { runInnerAgent } from '../run_inner_agent';

/**
 * Resume the inner agent after the outer `ai.agent` step is resumed.
 *
 * The inner agent paused on its OWN conversation with a pending form prompt that
 * references the inner workflow execution. Simply re-running the inner agent with
 * the original message fails preflight validation ("Conversation is awaiting prompt
 * responses, but N response(s) are missing") because the pending prompt is never
 * answered and the round is never sealed.
 *
 * To resume correctly we mirror the proven top-level chat resume path: answer the
 * inner conversation's pending form prompt via `handleFormPromptResponse` (which
 * resumes the inner workflow under CAS, seals the round, and observes the advanced
 * execution), then re-run the inner agent with a pure form submission
 * (`nextInput.form_prompts`, no message) plus the resumed execution state so the
 * stale workflow tool result is refreshed before the LLM re-processes it.
 *
 * When no inner conversation was stored (e.g. `create-conversation` was false) there
 * is no pending prompt to answer, so we fall back to resuming the inner workflow
 * directly and re-running with the original input.
 */
export const resumeInnerAgent = async ({
  abortSignal,
  agentId,
  connectorId,
  conversationClient,
  conversationIdFromInput,
  createConversation,
  executionService,
  logger,
  nextInput,
  request,
  resumeInput,
  schema,
  spaceId,
  stepState,
  workflowApi,
}: {
  abortSignal: AbortSignal;
  agentId: string;
  connectorId: string | undefined;
  conversationClient: ConversationClient | undefined;
  conversationIdFromInput: string | undefined;
  createConversation: boolean | undefined;
  executionService: AgentExecutionService;
  logger: Logger | undefined;
  nextInput: ConverseInput;
  request: KibanaRequest;
  resumeInput: Record<string, unknown>;
  schema: Record<string, unknown> | undefined;
  spaceId: string;
  stepState: Record<string, unknown>;
  workflowApi: WorkflowsManagementApi | undefined;
}): Promise<{
  output: {
    message: string;
    structured_output: unknown;
    conversation_id?: string;
  };
}> => {
  const savedConversationId =
    typeof stepState.conversationId === 'string' ? stepState.conversationId : undefined;
  const innerExecutionId =
    typeof stepState.innerExecutionId === 'string' ? stepState.innerExecutionId : undefined;

  const pendingFormPrompt =
    conversationClient && savedConversationId && innerExecutionId
      ? await findPendingFormPrompt({
          conversationClient,
          conversationId: savedConversationId,
          innerExecutionId,
        })
      : undefined;

  // Proper resume path: the inner agent has a pending form prompt awaiting a response.
  if (
    workflowApi &&
    conversationClient &&
    savedConversationId &&
    innerExecutionId &&
    pendingFormPrompt
  ) {
    const formPromptResponse: FormPromptResponse = {
      execution_id: innerExecutionId,
      id: pendingFormPrompt.id,
      values: resumeInput,
      ...(pendingFormPrompt.resume_seq !== undefined && {
        expected_resume_seq: pendingFormPrompt.resume_seq + 1,
      }),
    };

    const outcome = await handleFormPromptResponse({
      conversationClient,
      conversationId: savedConversationId,
      formPromptResponse,
      logger,
      request,
      spaceId,
      workflowApi,
    });

    const resumedState: ResumedExecutionState = {
      execution_id: innerExecutionId,
      observedExecution: outcome.observedExecution,
      observedStatus: outcome.observedStatus,
    };

    const { outputConversationId, outputMessage, round } = await runInnerAgent({
      abortSignal,
      executionService,
      params: {
        agentId,
        autoCreateConversationWithId: createConversation,
        connectorId,
        conversationId: savedConversationId,
        nextInput: { form_prompts: [formPromptResponse] },
        outputSchema: schema,
        resumedStates: [resumedState],
        storeConversation: true,
        structuredOutput: !!schema,
      },
      request,
      schema,
      storeConversation: true,
    });

    return {
      output: {
        message: outputMessage,
        structured_output: round.response.structured_output,
        ...(outputConversationId && { conversation_id: outputConversationId }),
      },
    };
  }

  // Fallback path: no stored inner conversation / pending prompt. Resume the inner
  // workflow directly and re-run the inner agent with the original input.
  const { savedConversationId: resumedConversationId } = await resumeInnerWorkflow({
    request,
    resumeInput,
    spaceId,
    stepState,
    workflowApi,
  });

  const effectiveConversationId = resumedConversationId ?? conversationIdFromInput;
  const storeConversation = createConversation || Boolean(effectiveConversationId);

  const { outputConversationId, outputMessage, round } = await runInnerAgent({
    abortSignal,
    executionService,
    params: {
      agentId,
      autoCreateConversationWithId: createConversation,
      connectorId,
      conversationId: effectiveConversationId,
      nextInput,
      outputSchema: schema,
      storeConversation,
      structuredOutput: !!schema,
    },
    request,
    schema,
    storeConversation,
  });

  return {
    output: {
      message: outputMessage,
      structured_output: round.response.structured_output,
      ...(outputConversationId && { conversation_id: outputConversationId }),
    },
  };
};

const findPendingFormPrompt = async ({
  conversationClient,
  conversationId,
  innerExecutionId,
}: {
  conversationClient: ConversationClient;
  conversationId: string;
  innerExecutionId: string;
}) => {
  const conversation = await conversationClient.get(conversationId);
  const pending = conversation.rounds
    .flatMap((round) => round.pending_prompts ?? [])
    .find((prompt) => isFormPrompt(prompt) && prompt.execution_id === innerExecutionId);
  return pending && isFormPrompt(pending) ? pending : undefined;
};
