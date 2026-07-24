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
  type Example,
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
  type ExpectAttachmentDataFn,
  type ExpectRenderAttachment,
} from './evaluators/expected_attachment';
import { skippedResult, withLowScoreLogging } from './evaluator_utils';

export interface RuleManagementExample extends Example {
  input: {
    /**
     * Ordered user messages. Each turn is sent sequentially over the same
     * `conversation_id`, so the agent retains context between messages.
     * Skill/tool/criteria assertions are evaluated across the whole
     * conversation (the union of all turns' steps and messages). Use a
     * one-element array for a single-turn example.
     */
    turns: string[];
  };
  output: {
    /**
     * Free-form quality criteria scored by the LLM Criteria judge.
     * Omit to skip the Criteria evaluator; if present, must contain at least
     * one non-empty string.
     */
    criteria?: string[];
  };
  metadata?: {
    expectedToolIds?: readonly string[];
    expectedAnyOfToolIds?: readonly string[];
    expectRenderAttachment?: ExpectRenderAttachment;
    expectAttachmentData?: ExpectAttachmentDataFn;
    expectedSkills?: readonly string[];
    notExpectedSkill?: string;
  } | null;
}

export type EvaluateDataset = (params: {
  dataset: {
    name: string;
    description: string;
    examples: RuleManagementExample[];
  };
}) => Promise<void>;

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

/**
 * Project Criteria-compatible messages from persisted conversation rounds.
 * `role` reflects which round field the text came from (`input` vs `response`).
 */
export const messagesFromRounds = (
  rounds: ConversationRound[]
): Array<{ role: 'user' | 'assistant'; message: string }> =>
  rounds.flatMap((round) => [
    { role: 'user' as const, message: round.input.message },
    { role: 'assistant' as const, message: round.response?.message ?? '' },
  ]);

export const createTask = (
  chatClient: RuleManagementChatClient
): ExperimentTask<RuleManagementExample, TaskOutput> => {
  return async ({ input }) => {
    const userTurns = input.turns;

    let conversationId: string | undefined;
    const steps: unknown[] = [];
    const errors: unknown[] = [];
    let traceId: string | undefined;
    // Structured prompts (e.g. `ask_user_question`) the agent asked across the conversation.
    // Surfaced in the task output so the LLM Criteria judge and low-score logs can see what
    // was asked even when assistant prose is empty.
    const prompts: PromptRequest[] = [];
    // Prompts the agent is awaiting a response to, carried over between turns so the next
    // scripted turn is delivered as the answer rather than a rejected free-text message.
    let pendingPrompts: PromptRequest[] = [];

    for (let turnIndex = 0; turnIndex < userTurns.length; turnIndex++) {
      const turnText = userTurns[turnIndex];
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

    // Authoritative transcript + attachments come from GET conversation (rounds),
    // not from a harness-synthesized message list.
    let rounds: ConversationRound[] = [];
    let attachments: VersionedAttachment[] = [];
    if (conversationId) {
      try {
        const conversation = await chatClient.getConversation(conversationId);
        rounds = conversation.rounds ?? [];
        attachments = conversation.attachments ?? [];
      } catch (error) {
        errors.push({
          error: {
            message: error instanceof Error ? error.message : 'Failed to get conversation',
            stack: error instanceof Error ? error.stack : undefined,
          },
          type: 'error',
        });
        try {
          attachments = await chatClient.listAttachments(conversationId);
        } catch (attachmentError) {
          errors.push({
            error: {
              message:
                attachmentError instanceof Error
                  ? attachmentError.message
                  : 'Failed to list attachments',
              stack: attachmentError instanceof Error ? attachmentError.stack : undefined,
            },
            type: 'error',
          });
        }
      }
    }

    return {
      errors,
      rounds,
      messages: messagesFromRounds(rounds),
      steps,
      traceId,
      prompts,
      conversationId,
      attachments,
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
