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
import type { PromptRequest, PromptResponse } from '@kbn/agent-builder-common/agents';
import {
  isAskUserQuestionPrompt,
  isConfirmationPrompt,
  isAuthorizationPrompt,
} from '@kbn/agent-builder-common/agents';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { ToolingLog } from '@kbn/tooling-log';
import { resolveRuleAttachmentData } from './attachments';
import type { RuleManagementChatClient } from './chat_client';
import { createExpectedSkillEvaluator } from './evaluators/expected_skill';
import {
  createExpectedAnyOfToolIdsEvaluator,
  createExpectedToolCalledEvaluator,
} from './evaluators/expected_tool_called';
import {
  createExpectedRenderAttachmentEvaluator,
  getAssistantMessages,
  type ExpectRenderAttachment,
} from './evaluators/expected_render_attachment';
import { withLowScoreLogging } from './evaluator_utils';

export interface RuleManagementExample extends Example {
  input: {
    /** Single user message (single-turn). Use `turns` for a multi-turn conversation. */
    question?: string;
    /**
     * Ordered user messages for a multi-turn conversation. Each turn is sent
     * sequentially over the same `conversation_id`, so the agent retains context
     * between messages. Skill/tool/criteria assertions are evaluated across the
     * whole conversation (the union of all turns' steps and messages).
     */
    turns?: string[];
  };
  output: {
    /**
     * Graded expectations scored by the LLM Criteria judge (together with
     * {@link criteria}). Prefer these for the high-level checklist of what
     * “good” looks like for the example.
     */
    expected?: string | string[];
    /**
     * Additional free-form quality criteria scored by the same LLM Criteria
     * judge. Combined with {@link expected} into one Criteria score.
     */
    criteria?: string[];
  };
  metadata?: {
    /** The conversation must call every tool in this list at least once. */
    expectedToolIds?: readonly string[];
    /**
     * Alternative tool expectation: the conversation must call at least one of
     * these tools (e.g. `index_explorer` OR `list_indices`). Put hard
     * single-tool requirements in {@link expectedToolIds} instead.
     */
    expectedAnyOfToolIds?: readonly string[];
    /**
     * Render-attachment expectation:
     * - `true`: at least one valid `<render_attachment>` tag must appear
     * - `string[]`: each listed attachment type (e.g. `rule`, `workflow.yaml`,
     *   `action_policy`) must be rendered via a tag whose id resolves to that
     *   type in the conversation attachments
     * - `{ types?, assert? }`: combine type checks with an optional Jest-style
     *   structural assert on the resolved rule attachment
     */
    expectRenderAttachment?: ExpectRenderAttachment;
    /**
     * The conversation must load **every** skill in this list at least once.
     * Use a one-element array for a single skill. Prefer this over a singular
     * field — there is no `expectedSkill` on this type (excess-property checks
     * reject it in specs).
     */
    expectedSkills?: readonly string[];
    /** The conversation must NOT load this skill. */
    shouldNotActivateSkill?: string;
    /** Human-readable label describing the intent under test. */
    query_intent?: string;
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
 * Builds the full LLM-judged checklist for an example: `output.expected`
 * (string or string[]) followed by `output.criteria`. Both contribute to the
 * single Criteria evaluator score.
 */
export const collectScoredCriteria = (
  output: RuleManagementExample['output'] | null | undefined
): string[] => {
  const expectedItems = Array.isArray(output?.expected)
    ? output.expected
    : output?.expected
    ? [output.expected]
    : [];
  const criteriaItems = output?.criteria ?? [];
  return [...expectedItems, ...criteriaItems].filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );
};

const createCriteriaEvaluator = (evaluators: DefaultEvaluators): Evaluator => ({
  name: 'Criteria',
  kind: 'LLM',
  evaluate: async ({ expected, ...rest }) => {
    const scoredCriteria = collectScoredCriteria(
      expected as RuleManagementExample['output'] | null | undefined
    );
    if (scoredCriteria.length === 0) {
      return {
        score: null,
        label: 'skipped',
        explanation: 'No expected/criteria provided for this example',
      };
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

export const createTask = (
  chatClient: RuleManagementChatClient
): ExperimentTask<RuleManagementExample, TaskOutput> => {
  return async ({ input }) => {
    // Both single-turn (`question`) and multi-turn (`turns`) are supported. The
    // turns are sent sequentially over one `conversation_id` so the agent retains
    // context between user messages.
    const userTurns = input.turns ?? (input.question ? [input.question] : []);

    let conversationId: string | undefined;
    const messages: Array<{ message: string }> = [];
    const steps: unknown[] = [];
    const errors: unknown[] = [];
    let traceId: string | undefined;
    // Structured prompts (e.g. `ask_user_question`) the agent asked in response to the
    // opener (turn 0). Surfaced in the task output so the LLM `Criteria` judge can see how the
    // agent tried to disambiguate Alerting V2 vs Security up front (and so low-score logs can
    // show exactly what was asked), even when the opener's prose message is empty.
    const openerPrompts: unknown[] = [];
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
      messages.push(...response.messages);
      if (response.steps) steps.push(...response.steps);
      errors.push(...response.errors);
      traceId = response.traceId ?? traceId;

      if (turnIndex === 0) {
        openerPrompts.push(...response.prompts);
      }

      pendingPrompts = response.prompts;
    }

    // Load conversation attachments so CODE evaluators (and the Criteria judge) can
    // inspect the composed rule payload, not only tool-call params / render tags.
    let attachments: VersionedAttachment[] = [];
    if (conversationId) {
      try {
        attachments = await chatClient.listAttachments(conversationId);
      } catch (error) {
        errors.push({
          error: {
            message: error instanceof Error ? error.message : 'Failed to list attachments',
            stack: error instanceof Error ? error.stack : undefined,
          },
          type: 'error',
        });
      }
    }

    const ruleAttachment = resolveRuleAttachmentData(
      attachments,
      getAssistantMessages({ messages })
    );

    return {
      errors,
      messages,
      steps,
      traceId,
      openerPrompts,
      conversationId,
      attachments,
      ruleAttachment,
    };
  };
};

export const createEvaluateDataset = ({
  chatClient,
  evaluators,
  executorClient,
  log,
}: {
  chatClient: RuleManagementChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  log: ToolingLog;
}): EvaluateDataset => {
  return async ({ dataset: { name, description, examples } }) => {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    // Wrap every evaluator so any sub-1 score logs a self-contained report (transcript,
    // opener prompts, explanation, trace id) straight to the test output.
    //
    // Whether the agent tried to disambiguate Alerting V2 vs Security on the opener — via a
    // structured `ask_user_question` or in prose — is judged by the LLM `Criteria` evaluator
    // rather than a brittle regex. The task output includes `openerPrompts`, so the judge sees
    // the structured prompt content (options/labels), not just the assistant's prose.
    const selectedEvaluators = selectEvaluators<RuleManagementExample, TaskOutput>(
      [
        createExpectedSkillEvaluator(),
        createExpectedToolCalledEvaluator(),
        createExpectedAnyOfToolIdsEvaluator(),
        createExpectedRenderAttachmentEvaluator(),
        createCriteriaEvaluator(evaluators),
      ].map((evaluator) => withLowScoreLogging(evaluator, log))
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
