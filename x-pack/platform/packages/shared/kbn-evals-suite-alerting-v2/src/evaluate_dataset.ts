/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  selectEvaluators,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type ExperimentTask,
  type TaskOutput,
} from '@kbn/evals';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';
import {
  isAskUserQuestionPrompt,
  isConfirmationPrompt,
  isAuthorizationPrompt,
} from '@kbn/agent-builder-common/agents';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleManagementChatClient } from './chat_client';
import { createExpectedSkillEvaluator } from './evaluators/expected_skill';
import {
  createExpectedAnyOfToolIdsEvaluator,
  createExpectedToolCalledEvaluator,
} from './evaluators/expected_tool_called';
import {
  createExpectedAttachmentDataEvaluator,
  createExpectedRenderAttachmentEvaluator,
} from './evaluators/expected_attachment';
import { skippedResult, withLowScoreLogging } from './evaluator_utils';
import type { ConversationTurnResult, EvaluateDataset, RuleManagementExample } from './types';

/**
 * Resolves Criteria strings from example output.
 * - `null` when `criteria` is omitted (evaluator should skip)
 * - throws when `criteria` is present but empty / only blanks / not an array
 */
export const collectScoredCriteria = (
  output: RuleManagementExample['output'] | null | undefined
): string[] | null => {
  if (output == null || output.criteria === undefined || output.criteria === null) {
    return null;
  }
  if (!Array.isArray(output.criteria)) {
    throw new Error('criteria must be an array of non-empty strings');
  }
  const scoredCriteria = output.criteria.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );
  if (scoredCriteria.length === 0) {
    throw new Error('criteria must contain at least one non-empty string');
  }
  return scoredCriteria;
};

const createCriteriaEvaluator = (evaluators: DefaultEvaluators): Evaluator => ({
  name: 'Criteria',
  kind: 'LLM',
  evaluate: async ({ expected, ...rest }) => {
    const scoredCriteria = collectScoredCriteria(
      expected as RuleManagementExample['output'] | null | undefined
    );
    if (scoredCriteria == null) {
      return skippedResult('No criteria expectation for this example');
    }
    return evaluators.criteria(scoredCriteria).evaluate({ expected, ...rest });
  },
});

/**
 * Builds answers to the prompts the agent is currently awaiting, using the next scripted
 * user turn as the answer. `ask_user_question` prompts are answered with the turn text as
 * free-text (`custom`) — mirroring a real user typing a reply — so the answer is robust
 * regardless of the options the model generated. HITL confirmation/authorization prompts
 * default to proceeding so the conversation can continue.
 */
export const buildPromptResponses = (
  prompts: PromptRequest[],
  answerText: string
): Record<string, PromptResponse> => {
  const responses: Record<string, PromptResponse> = {};
  for (const prompt of prompts) {
    if (isAskUserQuestionPrompt(prompt)) {
      responses[prompt.id] = { answers: prompt.questions.map(() => ({ custom: answerText })) };
    } else if (isConfirmationPrompt(prompt)) {
      responses[prompt.id] = { allow: true };
    } else if (isAuthorizationPrompt(prompt)) {
      responses[prompt.id] = { authorized: true };
    }
  }
  return responses;
};

export const messagesFromRounds = (
  rounds: ConversationRound[]
): Array<{ role: 'user' | 'assistant'; message: string }> =>
  rounds.flatMap((round) => [
    { role: 'user' as const, message: round.input.message },
    { role: 'assistant' as const, message: round.response?.message ?? '' },
  ]);

/**
 * Sends each scripted user turn over the same conversation, answering any pending
 * prompts from the previous turn so multi-turn flows can continue.
 */
export const runConversationTurns = async (
  chatClient: RuleManagementChatClient,
  turns: string[]
): Promise<ConversationTurnResult> => {
  let conversationId: string | undefined;
  const steps: unknown[] = [];
  const errors: unknown[] = [];
  let traceId: string | undefined;
  const prompts: PromptRequest[] = [];
  // Prompts the agent is awaiting a response to, carried over between turns so the next
  // scripted turn is delivered as the answer rather than a rejected free-text message.
  let pendingPrompts: PromptRequest[] = [];

  for (const turnText of turns) {
    const response = await chatClient.converse({
      messages: [{ message: turnText }],
      conversationId,
      promptResponses:
        pendingPrompts.length > 0 ? buildPromptResponses(pendingPrompts, turnText) : undefined,
    });
    conversationId = response.conversationId ?? conversationId;
    if (response.steps) steps.push(...response.steps);
    errors.push(...response.errors);
    traceId = response.traceId ?? traceId;
    prompts.push(...response.prompts);
    pendingPrompts = response.prompts;
  }

  return { conversationId, steps, errors, traceId, prompts };
};

/**
 * Loads authoritative rounds + attachments from GET conversation.
 * Retries live in the chat client; after they are exhausted this throws — the
 * conversation is the core of the eval task, so we do not degrade silently.
 */
export const loadConversationState = async (
  chatClient: RuleManagementChatClient,
  conversationId: string | undefined
): Promise<{ rounds: ConversationRound[]; attachments: VersionedAttachment[] }> => {
  if (!conversationId) {
    throw new Error('No conversationId after converse; cannot load conversation state');
  }

  const conversation = await chatClient.getConversation(conversationId);
  return {
    rounds: conversation.rounds ?? [],
    attachments: conversation.attachments ?? [],
  };
};

export const createTask = (
  chatClient: RuleManagementChatClient
): ExperimentTask<RuleManagementExample, TaskOutput> => {
  return async ({ input }) => {
    const turnResult = await runConversationTurns(chatClient, input.turns);
    const { rounds, attachments } = await loadConversationState(
      chatClient,
      turnResult.conversationId
    );

    return {
      ...turnResult,
      rounds,
      attachments,
      messages: messagesFromRounds(rounds),
    };
  };
};

export const createEvaluateDataset = ({
  chatClient,
  evaluators,
  executorClient,
  log,
  testTitle,
}: {
  chatClient: RuleManagementChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  log: ToolingLog;
  testTitle?: string;
}): EvaluateDataset => {
  return async ({ dataset: { name, description, examples } }) => {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    const selectedEvaluators = selectEvaluators<RuleManagementExample, TaskOutput>(
      [
        createExpectedSkillEvaluator(),
        createExpectedToolCalledEvaluator(),
        createExpectedAnyOfToolIdsEvaluator(),
        createExpectedRenderAttachmentEvaluator(),
        createExpectedAttachmentDataEvaluator(),
        createCriteriaEvaluator(evaluators),
      ].map((evaluator) => withLowScoreLogging(evaluator, log, { testTitle }))
    );

    await executorClient.runExperiment(
      {
        datasets: [dataset],
        task: createTask(chatClient),
      },
      selectedEvaluators
    );
  };
};
