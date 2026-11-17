/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCurrentTraceId, withTurnSpan } from '../utils/tracing';
import { answerPromptsWithNextTurn } from './prompt_responses';
import type {
  ConversationInput,
  ConversationMessage,
  ConversationResult,
  ConversationStopReason,
  ConversationTarget,
  ConversationTurnInput,
  ConversationTurnResult,
  MultiTurnError,
  MultiTurnHooks,
  MultiTurnTaskContext,
  NextMessageFn,
  RespondToPromptsFn,
  TargetConversation,
  TargetTurnReply,
  TargetTurnRequest,
} from './types';

export const DEFAULT_MAX_TURNS = 20;

export interface RunConversationParams {
  target: ConversationTarget;
  conversation: ConversationInput;
  context: MultiTurnTaskContext;
  /** Chooses further turns after the scripted ones. Never sees the example's expected output. */
  nextMessage?: NextMessageFn;
  /** How to answer prompts the agent is waiting on. Defaults to {@link answerPromptsWithNextTurn}. */
  respondToPrompts?: RespondToPromptsFn;
  /** Upper bound on the conversation's turns, scripted and chosen together. */
  maxTurns?: number;
  /** A turn that takes longer is checked against the target instead of being awaited. */
  turnTimeoutMs?: number;
  beforeTurn?: MultiTurnHooks['beforeTurn'];
  /** Turn ids already used in the example; per-turn scores are named by them. */
  usedTurnIds?: Set<string>;
}

/** Thrown when a conversation can't continue; `result` keeps the turns that completed. */
export class ConversationRunError extends Error {
  constructor(
    public readonly error: MultiTurnError,
    public readonly result: ConversationResult,
    options?: { cause?: unknown }
  ) {
    super(error.message, options);
    this.name = 'ConversationRunError';
  }
}

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number | undefined): Promise<T> => {
  if (timeoutMs === undefined) {
    return promise;
  }
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`The turn took longer than ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

const toMessages = (
  conversationKey: string,
  turns: readonly ConversationTurnResult[]
): ConversationMessage[] =>
  turns.flatMap(({ id, message, response }) => [
    { role: 'user' as const, message, turnId: id, conversationKey },
    { role: 'assistant' as const, message: response, turnId: id, conversationKey },
  ]);

type TurnOutcome = 'failed' | 'unknown';

/** Thrown by {@link sendTurn} when the turn failed; `outcome` says whether it may have applied. */
const turnFailure = (outcome: TurnOutcome, cause: unknown): Error & { outcome: TurnOutcome } =>
  Object.assign(new Error(toErrorMessage(cause), { cause }), { outcome });

const outcomeOf = (error: unknown): TurnOutcome =>
  error instanceof Error && 'outcome' in error && error.outcome === 'failed' ? 'failed' : 'unknown';

/**
 * Sends a turn once. When the call fails or times out, the target is asked whether the turn was
 * applied: an applied turn's reply is read back, and a turn that never reached the target is
 * sent one more time. A turn the target can't account for is never sent again.
 */
const sendTurn = async (
  conversation: TargetConversation,
  request: TargetTurnRequest,
  turnTimeoutMs: number | undefined
): Promise<{ reply: TargetTurnReply; recovered: boolean }> => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return {
        reply: await withTimeout(conversation.send(request), turnTimeoutMs),
        recovered: false,
      };
    } catch (error) {
      if (!conversation.reconcile) {
        throw turnFailure('unknown', error);
      }
      const outcome = await conversation.reconcile(request);
      if (outcome === 'unknown') {
        throw turnFailure('unknown', error);
      }
      if (outcome !== 'not_applied') {
        return { reply: outcome, recovered: true };
      }
      if (attempt === 2) {
        throw turnFailure('failed', error);
      }
    }
  }
  throw turnFailure('failed', new Error('The turn was not sent'));
};

/**
 * Runs one conversation against a target: the scripted turns in order, then any turns
 * `nextMessage` chooses, up to `maxTurns`. Prompts the agent is waiting on (such as
 * `ask_user_question`) are answered with the next turn. Each turn runs in its own root span, so
 * every turn has its own trace for trace-based evaluators.
 */
export const runConversation = async ({
  target,
  conversation: { id: key, turns: scriptedTurns },
  context,
  nextMessage,
  respondToPrompts = answerPromptsWithNextTurn,
  maxTurns = DEFAULT_MAX_TURNS,
  turnTimeoutMs,
  beforeTurn,
  usedTurnIds = new Set<string>(),
}: RunConversationParams): Promise<ConversationResult> => {
  const turns: ConversationTurnResult[] = [];
  let conversationId: string | undefined;

  const buildResult = (stopReason: ConversationStopReason): ConversationResult => ({
    key,
    conversationId,
    turns,
    messages: toMessages(key, turns),
    stopReason,
  });
  const fail = (error: Omit<MultiTurnError, 'conversationKey'>, cause?: unknown) =>
    new ConversationRunError({ ...error, conversationKey: key }, buildResult('failed'), { cause });

  let targetConversation: TargetConversation;
  try {
    targetConversation = await target.startConversation({ key, context });
    conversationId = targetConversation.id;
  } catch (error) {
    throw fail(
      {
        phase: 'setup',
        message: `Could not start conversation "${key}": ${toErrorMessage(error)}`,
      },
      error
    );
  }

  const chooseNextTurn = async (): Promise<
    | { turn: ConversationTurnInput; source: ConversationTurnResult['source'] }
    | { stopReason: ConversationStopReason }
  > => {
    if (turns.length >= maxTurns) {
      return { stopReason: 'max_turns' };
    }
    if (turns.length < scriptedTurns.length) {
      return { turn: scriptedTurns[turns.length], source: 'scripted' };
    }
    if (!nextMessage) {
      return { stopReason: 'turns_exhausted' };
    }
    try {
      const turn = await nextMessage({
        turns,
        conversationKey: key,
        input: context.example.input ?? {},
      });
      return turn ? { turn, source: 'callback' } : { stopReason: 'stopped' };
    } catch (error) {
      throw fail(
        { phase: 'next_message', message: `nextMessage failed: ${toErrorMessage(error)}` },
        error
      );
    }
  };

  let pendingPrompts: unknown[] = [];
  let next = await chooseNextTurn();

  while (!('stopReason' in next)) {
    const { turn, source } = next;
    if (usedTurnIds.has(turn.id)) {
      throw fail({
        phase: source === 'callback' ? 'next_message' : 'setup',
        message: `Turn id "${turn.id}" is used more than once in the example; per-turn scores are named by it`,
        turnId: turn.id,
      });
    }
    usedTurnIds.add(turn.id);

    if (beforeTurn) {
      try {
        await beforeTurn(turn, { ...context, conversationKey: key });
      } catch (error) {
        throw fail(
          {
            phase: 'setup',
            message: `beforeTurn failed for "${turn.id}": ${toErrorMessage(error)}`,
            turnId: turn.id,
          },
          error
        );
      }
    }

    const promptResponses =
      pendingPrompts.length > 0 ? respondToPrompts(pendingPrompts, turn) : undefined;
    const answeredPrompts =
      promptResponses !== undefined && Object.keys(promptResponses).length > 0;
    const request: TargetTurnRequest = {
      turn,
      ...(answeredPrompts ? { promptResponses } : {}),
    };
    const startedAt = Date.now();

    try {
      const { reply, recovered, spanTraceId } = await withTurnSpan(
        `turn · ${turn.id}`,
        {
          attributes: {
            'evals.turn.id': turn.id,
            'evals.turn.index': turns.length,
            'evals.conversation.key': key,
            ...(conversationId ? { 'gen_ai.conversation.id': conversationId } : {}),
          },
        },
        async () => ({
          ...(await sendTurn(targetConversation, request, turnTimeoutMs)),
          spanTraceId: getCurrentTraceId() ?? undefined,
        })
      );

      // The target's spans nest under the turn span, so the ids normally match. Ids the target
      // reports win, as they do for single-turn tasks.
      const traceIds =
        reply.traceIds.length > 0 ? reply.traceIds : spanTraceId ? [spanTraceId] : [];
      pendingPrompts = reply.prompts;

      turns.push({
        id: turn.id,
        index: turns.length,
        conversationKey: key,
        source,
        message: turn.message,
        answeredPrompts,
        response: reply.response,
        steps: reply.steps,
        prompts: reply.prompts,
        traceId: traceIds.at(-1),
        traceIds,
        tokensUsed: reply.tokensUsed,
        durationMs: Date.now() - startedAt,
        ...(recovered ? { recovered } : {}),
      });
    } catch (error) {
      const outcome = outcomeOf(error);
      throw fail(
        {
          phase: 'agent_call',
          outcome,
          turnId: turn.id,
          message: `Turn "${turn.id}" ${
            outcome === 'unknown' ? 'has an unknown outcome' : 'failed'
          } after ${turns.length} completed turn(s): ${toErrorMessage(error)}`,
        },
        error
      );
    }

    next = await chooseNextTurn();
  }

  return buildResult(next.stopReason);
};
