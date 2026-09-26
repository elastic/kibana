/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  AskUserQuestionStep,
  ChatAgentEvent,
  ConversationRoundStep,
  ToolCallStep,
} from '@kbn/agent-builder-common';
import {
  createUserQuestionAnsweredEvent,
  isAskUserQuestionStep,
  isReasoningStep,
  isToolCallStep,
} from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import {
  AgentPromptType,
  isAskUserQuestionPrompt,
  type AskUserQuestionAnswer,
  type AskUserQuestionItem,
  type AskUserQuestionPromptResponse,
  type PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import type {
  ToolCallWithReasoning,
  ToolIdMapping,
} from '@kbn/agent-builder-genai-utils/langchain';
import type { ResearchOutcome, ToolRenderStateMap } from '../transient_state';
import type { ConversationTurn } from './conversation_turn';

export interface ResumeInitialization {
  steps: ConversationRoundStep[];
  pendingToolCallIds: string[];
  researchOutcome?: ResearchOutcome;
  toolRenderState: ToolRenderStateMap;
  /** Prompt ids whose answers were folded into ask steps (emitted as user_question_answered). */
  consumedPromptIds: string[];
  currentCycle: number;
  errorCount: number;
}

const invalidState = (message: string) =>
  createAgentExecutionError(message, AgentExecutionErrorCode.invalidState, {});

/**
 * Folds the stored answers into the pending ask_user_question steps, emitting one
 * `user_question_answered` event per answered prompt.
 */
const applyAskAnswers = (
  steps: ConversationRoundStep[],
  promptState: PromptStorageState,
  eventEmitter: (event: ChatAgentEvent) => void
): { steps: ConversationRoundStep[]; consumedPromptIds: string[] } => {
  const consumedPromptIds: string[] = [];
  const answered = steps.map((step) => {
    if (!isAskUserQuestionStep(step) || step.answers !== undefined) {
      return step;
    }
    const stored = promptState.responses[step.prompt_id];
    if (!stored || stored.type !== AgentPromptType.ask_user_question) {
      throw new Error(
        `No ask_user_question response found in prompt state for prompt_id ${step.prompt_id}`
      );
    }
    const response = stored.response;
    validateResponse({ step, response });

    eventEmitter(
      createUserQuestionAnsweredEvent({
        prompt_id: step.prompt_id,
        answers: response.answers,
      })
    );
    consumedPromptIds.push(step.prompt_id);

    return { ...step, answers: response.answers };
  });
  return { steps: answered, consumedPromptIds };
};

/** Builds the seeded graph state for a HITL resume from the paused turn and the stored prompt responses. */
export const buildResumeInitialization = ({
  turn,
  promptState,
  agentBuilderToLangchainIdMap,
  eventEmitter,
}: {
  turn: ConversationTurn;
  promptState: PromptStorageState;
  /** agent-builder tool id → LangChain tool name (`reverseMap(toolManager.getToolIdMapping())`). */
  agentBuilderToLangchainIdMap: ToolIdMapping;
  eventEmitter: (event: ChatAgentEvent) => void;
}): ResumeInitialization => {
  const { steps, consumedPromptIds } = applyAskAnswers(turn.steps, promptState, eventEmitter);

  // RoundState nodes are one per non-ask prompt: the tool calls that paused the run. Ask prompts
  // are stored as steps and have no node.
  const nodes = turn.state?.agent.nodes ?? [];
  const nonAskPromptCount = turn.pendingPrompts.filter(
    (prompt) => !isAskUserQuestionPrompt(prompt)
  ).length;
  if (nonAskPromptCount !== nodes.length) {
    throw invalidState(
      `[resume] expected one RoundState node per tool prompt, got ${nodes.length} node(s) for ${nonAskPromptCount} prompt(s)`
    );
  }
  const pendingToolCallIds = nodes.map((node) => node.tool_call_id);

  // The reversed map (agent-builder id → LangChain name): `toolManager.getToolIdMapping()` goes the
  // other way and would leave dotted ids such as `my.tool` unmapped.
  const langchainNameFor = (toolId: string) => agentBuilderToLangchainIdMap.get(toolId) ?? toolId;
  const toolRenderState: ToolRenderStateMap = {};
  for (const step of steps) {
    if (isToolCallStep(step)) {
      toolRenderState[step.tool_call_id] = {
        toolName: langchainNameFor(step.tool_id),
        kind: 'server',
      };
    }
  }

  const pendingSteps = pendingToolCallIds.map((toolCallId) => {
    const step = steps.find(
      (candidate): candidate is ToolCallStep =>
        isToolCallStep(candidate) && candidate.tool_call_id === toolCallId
    );
    if (!step) {
      throw invalidState(`[resume] RoundState references unknown tool_call_id "${toolCallId}"`);
    }
    return step;
  });

  const reasoningSteps = steps.filter(isReasoningStep);
  const researchOutcome: ResearchOutcome | undefined =
    pendingSteps.length > 0
      ? {
          type: 'tool_calls',
          toolCallGroupId: pendingSteps[0].tool_call_group_id ?? uuidv4(),
          toolCalls: pendingSteps.map(
            (step): ToolCallWithReasoning => ({
              toolCallId: step.tool_call_id,
              toolName: langchainNameFor(step.tool_id),
              args: step.params,
              reasoning:
                reasoningSteps
                  .filter((reasoning) => reasoning.tool_call_id === step.tool_call_id)
                  .map((reasoning) => reasoning.reasoning)
                  .join('\n') || undefined,
            })
          ),
        }
      : undefined;

  return {
    steps,
    pendingToolCallIds,
    researchOutcome,
    toolRenderState,
    consumedPromptIds,
    currentCycle: turn.state?.agent.current_cycle ?? 0,
    errorCount: turn.state?.agent.error_count ?? 0,
  };
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
