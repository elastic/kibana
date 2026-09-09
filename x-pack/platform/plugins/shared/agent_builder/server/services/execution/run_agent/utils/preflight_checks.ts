/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/agent-builder-common/base/errors';
import type { ConverseInput, ConversationAction, TimelineEvent } from '@kbn/agent-builder-common';
import { lastExecutionTerminated } from './context_timeline';

export const ensureValidInput = ({
  input,
  timeline,
  action,
}: {
  input: ConverseInput;
  timeline: TimelineEvent[];
  action?: ConversationAction;
}) => {
  // Regenerate uses the last round's input via prepareConversation - skip standard input check
  if (action === 'regenerate') {
    return;
  }

  // The last execution's terminal event tells whether the conversation is paused for a prompt.
  const outcome = lastExecutionTerminated(timeline)?.data.outcome;
  const pendingPrompts = outcome?.type === 'prompt_requested' ? outcome.prompts : [];

  // standard scenario - we need input to continue
  if (outcome?.type !== 'prompt_requested') {
    if (!hasStandardInput(input)) {
      throw createBadRequestError(`No standard input was provided to continue the conversation.`);
    }
  }

  // prompt pending - we need prompt responses for all pending prompts to continue
  if (pendingPrompts.length > 0) {
    const missingResponses = pendingPrompts.filter((p) => !hasPromptResponse(p.id, input));
    if (missingResponses.length > 0) {
      throw createBadRequestError(
        `Conversation is awaiting prompt responses, but ${missingResponses.length} response(s) are missing.`
      );
    }
  }
};

const hasStandardInput = (input: ConverseInput): boolean => {
  return input.message !== undefined || (input.attachments?.length ?? 0) > 0;
};

const hasPromptResponse = (promptId: string, input: ConverseInput): boolean => {
  return input.prompts !== undefined && Object.keys(input.prompts).includes(promptId);
};
