/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  createUserQuestionAnsweredEvent,
  internalTools,
  isAskUserQuestionStep,
  type AskUserQuestionStep,
  type ChatAgentEvent,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import {
  AgentPromptType,
  type AskUserQuestionAnswer,
  type AskUserQuestionItem,
  type AskUserQuestionPromptResponse,
  type PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import { toolCallAction, executeToolAction } from '../actions';
import type { ResearchAgentAction } from '../actions';
import type { ProcessedConversationRound } from './prepare_conversation';

/**
 * INVARIANT — single-caller path: the only tool that ever produces an `ask_user_question`
 * prompt (and thus a pending `ask_user_question` step) is the `ask_user_question` tool
 * itself. This helper does NOT re-invoke the tool handler on resume; it synthesizes the
 * action pair directly from the persisted step + the user's response. If any other tool
 * ever started producing `ask_user_question` prompts, its handler would silently never
 * re-run. Keep this path single-caller; do not expose helpers that would let another
 * tool enter it.
 */
export const pendingAskUserQuestionStepsToActions = ({
  round,
  promptState,
  eventEmitter,
}: {
  round: ConversationRound | ProcessedConversationRound;
  promptState: PromptStorageState;
  eventEmitter: (event: ChatAgentEvent) => void;
}): { actions: ResearchAgentAction[]; consumedPromptIds: string[] } => {
  const actions: ResearchAgentAction[] = [];
  const consumedPromptIds: string[] = [];

  const pendingSteps = round.steps
    .filter(isAskUserQuestionStep)
    .filter((step) => step.answers === undefined);

  for (const step of pendingSteps) {
    const stored = promptState.responses[step.prompt_id];
    if (!stored || stored.type !== AgentPromptType.ask_user_question) {
      throw new Error(
        `No ask_user_question response found in prompt state for prompt_id ${step.prompt_id}`
      );
    }
    const response = stored.response;

    validateResponse({ step, response });

    const toolCallId = uuidv4();
    actions.push(
      toolCallAction({
        toolCalls: [
          {
            toolName: internalTools.askUserQuestion,
            toolCallId,
            args: { questions: step.questions },
          },
        ],
      })
    );
    actions.push(
      executeToolAction({
        toolResults: [
          {
            toolCallId,
            content: JSON.stringify({ answers: response.answers }),
            artifact: { answers: response.answers },
          },
        ],
      })
    );

    eventEmitter(
      createUserQuestionAnsweredEvent({
        prompt_id: step.prompt_id,
        answers: response.answers,
      })
    );

    consumedPromptIds.push(step.prompt_id);
  }

  return { actions, consumedPromptIds };
};

const validateResponse = ({
  step,
  response,
}: {
  step: AskUserQuestionStep;
  response: AskUserQuestionPromptResponse;
}): void => {
  if (response.answers.length !== step.questions.length) {
    throw new Error(
      `ask_user_question response answer length (${response.answers.length}) does not match question length (${step.questions.length}) for prompt_id ${step.prompt_id}`
    );
  }
  step.questions.forEach((question, idx) => {
    validateAnswer({ question, answer: response.answers[idx], idx, promptId: step.prompt_id });
  });
};

const validateAnswer = ({
  question,
  answer,
  idx,
  promptId,
}: {
  question: AskUserQuestionItem;
  answer: AskUserQuestionAnswer;
  idx: number;
  promptId: string;
}): void => {
  const hasChoice = (answer.choice?.length ?? 0) > 0;
  const hasCustom = answer.custom != null && answer.custom !== '';

  if (answer.skipped === true) {
    if (hasChoice || hasCustom) {
      throw new Error(
        `prompt_id ${promptId} answer[${idx}]: skipped must be exclusive with choice/custom`
      );
    }
    return;
  }

  if (!hasChoice && !hasCustom) {
    throw new Error(
      `prompt_id ${promptId} answer[${idx}]: empty answer (no choice, custom, or skipped)`
    );
  }

  if (answer.choice) {
    for (const c of answer.choice) {
      if (c < 0 || c >= question.options.length) {
        throw new Error(
          `prompt_id ${promptId} answer[${idx}]: choice index ${c} out of bounds (options: ${question.options.length})`
        );
      }
    }
    if (!question.multi_select && answer.choice.length > 1) {
      throw new Error(
        `prompt_id ${promptId} answer[${idx}]: question is not multi_select; choice.length must be <= 1`
      );
    }
  }
};
