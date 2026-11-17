/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderClient } from '../utils/agent_builder_client';
import { getCurrentTraceId, withTurnSpan } from '../utils/tracing';
import { answerPromptsWithNextTurn } from './prompt_responses';
import type {
  ConversationMessage,
  ConversationResult,
  ConversationStopReason,
  ConversationTurnInput,
  ConversationTurnResult,
  MultiTurnExample,
  NextMessageFn,
  RespondToPromptsFn,
} from './types';

const DEFAULT_MAX_TURNS = 20;

export interface RunConversationParams {
  client: Pick<AgentBuilderClient, 'converse'>;
  agentId: string;
  /** Scripted user turns, sent in order before `nextMessage` is asked for more. */
  turns: readonly ConversationTurnInput[];
  /** Chooses further turns from the replies so far. Never sees the example's expected output. */
  nextMessage?: NextMessageFn;
  /** How to answer prompts the agent is waiting on. Defaults to {@link answerPromptsWithNextTurn}. */
  respondToPrompts?: RespondToPromptsFn;
  /** Upper bound on turns, scripted and chosen together. */
  maxTurns?: number;
  /** Continues an existing conversation, e.g. one prepared by a setup step. */
  conversationId?: string;
  signal?: AbortSignal;
}

/** Thrown when a turn fails; `result` holds the turns that completed before it. */
export class ConversationRunError extends Error {
  public readonly result: ConversationResult;

  constructor(message: string, result: ConversationResult, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ConversationRunError';
    this.result = result;
  }
}

const toMessages = (turns: readonly ConversationTurnResult[]): ConversationMessage[] =>
  turns.flatMap(({ id, message, response }) => [
    { role: 'user' as const, message, turnId: id },
    { role: 'assistant' as const, message: response, turnId: id },
  ]);

const buildResult = (
  conversationId: string | undefined,
  turns: ConversationTurnResult[],
  stopReason: ConversationStopReason
): ConversationResult => ({
  conversationId,
  turns,
  messages: toMessages(turns),
  stopReason,
});

const assertUniqueTurnIds = (turns: readonly ConversationTurnInput[]): void => {
  const seen = new Set<string>();
  for (const { id } of turns) {
    if (seen.has(id)) {
      throw new Error(`Turn id "${id}" is used more than once; per-turn scores are named by it`);
    }
    seen.add(id);
  }
};

/**
 * Runs one Agent Builder conversation: the scripted turns in order, then any turns
 * `nextMessage` chooses, up to `maxTurns`. Pending prompts (e.g. `ask_user_question`) are
 * answered with the next turn. Each turn runs in its own root span, so every turn has its
 * own trace id for trace-based evaluators.
 */
export const runConversation = async ({
  client,
  agentId,
  turns: scriptedTurns,
  nextMessage,
  respondToPrompts = answerPromptsWithNextTurn,
  maxTurns = DEFAULT_MAX_TURNS,
  conversationId: initialConversationId,
  signal,
}: RunConversationParams): Promise<ConversationResult> => {
  assertUniqueTurnIds(scriptedTurns);

  const results: ConversationTurnResult[] = [];
  const usedTurnIds = new Set<string>();
  let conversationId = initialConversationId;
  let pendingPrompts: unknown[] = [];

  const chooseNextTurn = async (): Promise<
    | { turn: ConversationTurnInput; source: ConversationTurnResult['source'] }
    | { stopReason: ConversationStopReason }
  > => {
    if (signal?.aborted) {
      return { stopReason: 'aborted' };
    }
    if (results.length >= maxTurns) {
      return { stopReason: 'max_turns' };
    }
    if (results.length < scriptedTurns.length) {
      return { turn: scriptedTurns[results.length], source: 'scripted' };
    }
    if (!nextMessage) {
      return { stopReason: 'turns_exhausted' };
    }
    const turn = await nextMessage({ turns: results });
    return turn ? { turn, source: 'callback' } : { stopReason: 'stopped' };
  };

  let next = await chooseNextTurn();
  while (!('stopReason' in next)) {
    const { turn, source } = next;
    if (usedTurnIds.has(turn.id)) {
      throw new ConversationRunError(
        `Turn id "${turn.id}" is used more than once; per-turn scores are named by it`,
        buildResult(conversationId, results, 'stopped')
      );
    }
    usedTurnIds.add(turn.id);

    const promptResponses =
      pendingPrompts.length > 0 ? respondToPrompts(pendingPrompts, turn) : undefined;
    const answeredPrompts =
      promptResponses !== undefined && Object.keys(promptResponses).length > 0;
    const startedAt = Date.now();

    try {
      const { response, spanTraceId } = await withTurnSpan(
        `turn · ${turn.id}`,
        {
          attributes: {
            'evals.turn.id': turn.id,
            'evals.turn.index': results.length,
            ...(conversationId ? { 'gen_ai.conversation.id': conversationId } : {}),
          },
        },
        async () => ({
          response: await client.converse({
            agentId,
            input: turn.message,
            conversationId,
            ...(answeredPrompts ? { promptResponses } : {}),
            ...(turn.attachments ? { attachments: turn.attachments } : {}),
          }),
          spanTraceId: getCurrentTraceId() ?? undefined,
        })
      );

      conversationId = response.conversationId ?? conversationId;
      pendingPrompts = response.prompts ?? [];

      results.push({
        id: turn.id,
        index: results.length,
        source,
        message: turn.message,
        answeredPrompts,
        response: response.message,
        steps: response.steps,
        prompts: pendingPrompts,
        // The agent's spans nest under the turn span, so both ids normally match. The id the
        // server reports wins, as it does for single-turn tasks.
        traceId: response.traceId ?? spanTraceId,
        tokensUsed: response.tokensUsed,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      throw new ConversationRunError(
        `Turn "${turn.id}" failed after ${results.length} completed turn(s): ${
          error instanceof Error ? error.message : String(error)
        }`,
        buildResult(conversationId, results, 'stopped'),
        { cause: error }
      );
    }

    next = await chooseNextTurn();
  }

  return buildResult(conversationId, results, next.stopReason);
};

/** Options for {@link createConversationTask}; the turns come from each example. */
export type ConversationTaskOptions = Omit<RunConversationParams, 'turns' | 'conversationId'>;

/** Builds an experiment task that runs each example's `input.turns` as one conversation. */
export const createConversationTask =
  (options: ConversationTaskOptions) =>
  async (example: MultiTurnExample): Promise<ConversationResult> => {
    const turns = example.input?.turns ?? [];
    if (turns.length === 0 && !options.nextMessage) {
      throw new Error('A multi-turn example needs input.turns or a nextMessage callback');
    }
    return runConversation({ ...options, turns });
  };
