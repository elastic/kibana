/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/agent-builder-common/base/errors';
import type { ConverseInput, ConversationAction, TimelineEvent } from '@kbn/agent-builder-common';
import { ConversationRoundStatus, getLastExecutionEvent } from '@kbn/agent-builder-common';

export const ensureValidInput = ({
  input,
  timelineEvents,
  action,
}: {
  input: ConverseInput;
  timelineEvents: TimelineEvent[];
  action?: ConversationAction;
}) => {
  // Regenerate uses the last event's input via prepareConversation - skip standard input check
  if (action === 'regenerate') {
    return;
  }

  const lastAgentResponse = getLastExecutionEvent(timelineEvents);

  const lastStatus = lastAgentResponse?.status ?? ConversationRoundStatus.completed;

  // standard scenario - we need input to continue
  if (lastStatus === ConversationRoundStatus.completed) {
    if (!hasStandardInput(input)) {
      throw createBadRequestError(`No standard input was provided to continue the conversation.`);
    }
  }

  // prompt pending - we need prompt responses for all pending prompts to continue
  const pendingPrompts = lastAgentResponse?.pending_prompts ?? [];
  if (pendingPrompts.length > 0 && lastStatus === ConversationRoundStatus.awaitingPrompt) {
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
