/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStatus, type ConversationRound } from '@kbn/agent-builder-common';
import { isFormPrompt } from '@kbn/agent-builder-common/agents';
import type { StepHandlerResult } from '@kbn/workflows-extensions/server';
import type { RunAgentStepOutputSchema } from '../../../../common/step_types/run_agent_step';

export const buildWaitingForInputResult = ({
  logger,
  outputConversationId,
  round,
}: {
  logger?: { debug(message: string, meta?: object): void };
  outputConversationId: string | undefined;
  round: ConversationRound;
}): StepHandlerResult<RunAgentStepOutputSchema> | null => {
  if (round.status !== ConversationRoundStatus.awaitingPrompt) {
    return null;
  }

  const formPrompt = round.pending_prompts?.find(isFormPrompt);

  logger?.debug(
    `[hitl-debug][ab] build.waitingForInput formPromptFound=${!!formPrompt} schemaPresent=${!!formPrompt?.schema} messagePresent=${!!formPrompt?.message}`
  );

  // Note: agent_context is intentionally NOT surfaced for the nested ai.agent HITL prompt.
  // Surfacing the inner agent's reasoning ("I'll trigger the workflow…") reframed the prompt as
  // "approve running the workflow" instead of the inner action being approved, diverging from the
  // direct waitForInput prompt. Omitting it keeps the nested prompt identical to the direct one.
  return {
    waitingForInput: {
      message: formPrompt?.message,
      schema: formPrompt?.schema,
      stepState: {
        conversationId: outputConversationId,
        innerExecutionId: formPrompt?.execution_id,
        ...(formPrompt?.resume_seq !== undefined && { innerResumeSeq: formPrompt.resume_seq }),
      },
    },
  };
};
