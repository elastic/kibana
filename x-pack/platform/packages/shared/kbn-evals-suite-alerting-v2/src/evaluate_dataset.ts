/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  selectEvaluators,
  type AgentBuilderClient,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type ExperimentTask,
  type TaskOutput,
} from '@kbn/evals';
import type { Conversation, ConversationRound } from '@kbn/agent-builder-common';
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';
import {
  isAskUserQuestionPrompt,
  isConfirmationPrompt,
  isAuthorizationPrompt,
} from '@kbn/agent-builder-common/agents';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { ToolingLog } from '@kbn/tooling-log';
import { createExpectedSkillEvaluator } from './evaluators/expected_skill';
import {
  createExpectedAnyOfToolIdsEvaluator,
  createExpectedToolCalledEvaluator,
} from './evaluators/expected_tool_called';
import {
  createExpectedAttachmentDataEvaluator,
  createExpectedRenderAttachmentEvaluator,
} from './evaluators/expected_attachment';
import { messagesFromRounds, skippedResult, withLowScoreLogging } from './evaluator_utils';
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
  direction: 'maximize',
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

/**
 * Sends each scripted user turn over the same conversation, answering any pending
 * prompts from the previous turn so multi-turn flows can continue.
 */
export const runConversationTurns = async (
  client: AgentBuilderClient,
  agentId: string,
  turns: string[]
): Promise<ConversationTurnResult> => {
  let conversationId: string | undefined;
  const steps: unknown[] = [];
  let traceId: string | undefined;
  const prompts: PromptRequest[] = [];
  // Prompts the agent is awaiting a response to, carried over between turns so the next
  // scripted turn is delivered as the answer rather than a rejected free-text message.
  let pendingPrompts: PromptRequest[] = [];

  for (const turnText of turns) {
    const promptResponses =
      pendingPrompts.length > 0 ? buildPromptResponses(pendingPrompts, turnText) : undefined;

    const response = await client.converse({
      agentId,
      input: turnText,
      conversationId,
      promptResponses,
    });
    conversationId = response.conversationId ?? conversationId;
    steps.push(...response.steps);
    traceId = response.traceId ?? traceId;
    const turnPrompts = response.prompts as PromptRequest[];
    prompts.push(...turnPrompts);
    pendingPrompts = turnPrompts;
  }

  return { conversationId, steps, traceId, prompts };
};

/**
 * Loads authoritative rounds + attachments from GET conversation.
 * Retries live in the client; after they are exhausted this throws — the
 * conversation is the core of the eval task, so we do not degrade silently.
 */
export const loadConversationState = async (
  client: AgentBuilderClient,
  conversationId: string | undefined
): Promise<{ rounds: ConversationRound[]; attachments: VersionedAttachment[] }> => {
  if (!conversationId) {
    throw new Error('No conversationId after converse; cannot load conversation state');
  }

  const conversation = await client.getConversation<Conversation>(conversationId);
  return {
    rounds: conversation.rounds ?? [],
    attachments: conversation.attachments ?? [],
  };
};

export const createTask = (
  client: AgentBuilderClient,
  agentId: string
): ExperimentTask<RuleManagementExample, TaskOutput> => {
  return async ({ input }) => {
    const turnResult = await runConversationTurns(client, agentId, input.turns);
    const { rounds, attachments } = await loadConversationState(client, turnResult.conversationId);

    return {
      ...turnResult,
      rounds,
      attachments,
      messages: messagesFromRounds(rounds),
    };
  };
};

export const createEvaluateDataset = ({
  agentBuilderClient,
  agentId,
  evaluators,
  executorClient,
  log,
  testTitle,
}: {
  agentBuilderClient: AgentBuilderClient;
  agentId: string;
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
        task: createTask(agentBuilderClient, agentId),
      },
      selectedEvaluators
    );
  };
};
