/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentTask } from '../types';
import { ConversationRunError, runConversation } from './run_conversation';
import type {
  ConversationInput,
  ConversationResult,
  ConversationTarget,
  MultiTurnError,
  MultiTurnExample,
  MultiTurnHooks,
  MultiTurnInput,
  MultiTurnResult,
  MultiTurnTaskContext,
  NextMessageFn,
  RespondToPromptsFn,
} from './types';

const DEFAULT_CONVERSATION_KEY = 'main';

export interface ConversationTaskOptions {
  /** The system under evaluation, e.g. {@link agentBuilderTarget} or {@link inferenceTarget}. */
  target: ConversationTarget;
  /** Chooses turns after the scripted ones, e.g. {@link createSimulatedUser}. */
  nextMessage?: NextMessageFn;
  respondToPrompts?: RespondToPromptsFn;
  /** Upper bound on turns per conversation, scripted and chosen together. */
  maxTurns?: number;
  /** A turn that takes longer is checked against the target instead of being awaited. */
  turnTimeoutMs?: number;
  hooks?: MultiTurnHooks;
}

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toConversations = (
  input: MultiTurnInput | undefined,
  hasNextMessage: boolean
): ConversationInput[] => {
  if (input?.conversations && input.conversations.length > 0) {
    return input.conversations;
  }
  if ((input?.turns && input.turns.length > 0) || hasNextMessage) {
    return [{ id: DEFAULT_CONVERSATION_KEY, turns: input?.turns ?? [] }];
  }
  throw new Error(
    'A multi-turn example needs input.turns, input.conversations or a nextMessage callback'
  );
};

const buildResult = (
  conversations: ConversationResult[],
  error: MultiTurnError | undefined,
  startedAt: number
): MultiTurnResult => ({
  status: error ? 'failed' : 'completed',
  conversations,
  turns: conversations.flatMap(({ turns }) => turns),
  messages: conversations.flatMap(({ messages }) => messages),
  ...(error ? { error } : {}),
  durationMs: Date.now() - startedAt,
});

/**
 * Builds an experiment task for multi-turn examples. Each example's conversations run in order
 * against the target, with the suite's hooks around them. A failure doesn't fail the experiment:
 * the result keeps the turns that completed and says where it failed, so evaluators still run
 * and the failure is stored with the scores.
 *
 * Examples that share state through the target (such as memory written by one example and read
 * by the next) must run with `concurrency: 1`; put warm-up conversations in the same example as
 * the measurement instead where possible.
 */
export const createConversationTask =
  ({
    target,
    nextMessage,
    respondToPrompts,
    maxTurns,
    turnTimeoutMs,
    hooks = {},
  }: ConversationTaskOptions): ExperimentTask<MultiTurnExample, MultiTurnResult> =>
  async (example, taskContext) => {
    const startedAt = Date.now();
    const context: MultiTurnTaskContext = { ...taskContext, example };
    const conversationInputs = toConversations(example.input, Boolean(nextMessage));
    const conversations: ConversationResult[] = [];
    const usedTurnIds = new Set<string>();
    let error: MultiTurnError | undefined;

    try {
      await hooks.beforeExample?.(context);
    } catch (setupError) {
      error = { phase: 'setup', message: `beforeExample failed: ${toErrorMessage(setupError)}` };
    }

    for (const conversation of conversationInputs) {
      if (error) {
        break;
      }
      try {
        await hooks.beforeConversation?.(conversation, context);
        conversations.push(
          await runConversation({
            target,
            conversation,
            context,
            nextMessage,
            respondToPrompts,
            maxTurns,
            turnTimeoutMs,
            beforeTurn: hooks.beforeTurn,
            usedTurnIds,
          })
        );
      } catch (runError) {
        if (runError instanceof ConversationRunError) {
          conversations.push(runError.result);
          error = runError.error;
        } else {
          error = {
            phase: 'setup',
            conversationKey: conversation.id,
            message: `beforeConversation failed for "${conversation.id}": ${toErrorMessage(
              runError
            )}`,
          };
        }
      }
    }

    const result = buildResult(conversations, error, startedAt);

    try {
      await hooks.afterExample?.(result, context);
    } catch (cleanupError) {
      result.cleanupErrors = [`afterExample failed: ${toErrorMessage(cleanupError)}`];
    }

    return result;
  };
