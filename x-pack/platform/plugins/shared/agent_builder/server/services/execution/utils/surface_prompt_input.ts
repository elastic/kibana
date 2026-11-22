/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import {
  createBadRequestError,
  createConversationPausedError,
} from '@kbn/agent-builder-common/base/errors';
import type { ConversationExecutionParams } from '@kbn/agent-builder-server/execution';
import { resolvePromptResponses } from '../../surfaces';
import { getPendingResumeRound } from './pending_round';

/**
 * Turns what a reader did on an origin's surface into the input that resumes a paused conversation:
 * the options they chose (`promptSelections`), or their reply (`nextInput.message`), become
 * `nextInput.prompts`. Requests without an origin, or that already carry prompt responses, are
 * left as they are.
 *
 * @throws A bad request when options were chosen for a conversation that is no longer paused, and
 * a conversation paused error when the pending prompts are left unanswered.
 */
export const resolveSurfacePromptInput = ({
  params: { promptSelections, ...params },
  conversation,
}: {
  params: ConversationExecutionParams;
  conversation: Conversation;
}): ConversationExecutionParams => {
  const { origin, nextInput } = params;

  // A reply is only read as an answer when it comes from an origin's surface.
  if (nextInput.prompts || (!origin && !promptSelections?.length)) {
    return params;
  }

  const prompts = getPendingResumeRound(conversation)?.pending_prompts ?? [];

  if (prompts.length === 0) {
    if (promptSelections?.length) {
      throw createBadRequestError(
        `Conversation ${conversation.id} is not waiting for an answer: its prompts were already answered.`
      );
    }

    return params;
  }

  const responses = resolvePromptResponses({
    prompts,
    selections: promptSelections,
    text: origin ? nextInput.message : undefined,
  });

  if (!responses) {
    throw createConversationPausedError({ conversationId: conversation.id });
  }

  return { ...params, nextInput: { ...nextInput, message: undefined, prompts: responses } };
};
