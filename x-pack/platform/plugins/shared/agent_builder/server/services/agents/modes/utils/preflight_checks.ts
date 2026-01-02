/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/agent-builder-common/base/errors';
import type { Conversation, ConverseInput } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';

export const ensureValidInput = ({
  input,
  conversation,
}: {
  input: ConverseInput;
  conversation?: Conversation;
}) => {
  const lastRoundStatus = conversation?.rounds.length
    ? conversation.rounds[conversation.rounds.length - 1].status
    : ConversationRoundStatus.completed;

  // standard scenario - we need input to continue
  if (lastRoundStatus === ConversationRoundStatus.completed) {
    if (!hasStandardInput(input)) {
      throw createBadRequestError(`No standard input was provided to continue the conversation.`);
    }
  }

  // prompt pending - we need a prompt response to continue
  if (lastRoundStatus === ConversationRoundStatus.awaitingPrompt) {
    if (!hasPromptResponse(input)) {
      throw createBadRequestError(
        `Conversation is awaiting a prompt response, but none was provided.`
      );
    }
  }
};

const hasStandardInput = (input: ConverseInput): boolean => {
  return input.message !== undefined || (input.attachments?.length ?? 0) > 0;
};

const hasPromptResponse = (input: ConverseInput): boolean => {
  return input.prompt_response !== undefined && Object.keys(input.prompt_response).length > 0;
};
