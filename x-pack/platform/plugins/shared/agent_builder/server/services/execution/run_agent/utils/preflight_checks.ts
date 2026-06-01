/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError } from '@kbn/agent-builder-common/base/errors';
import type { Conversation, ConverseInput, ConversationAction } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { isFormPrompt } from '@kbn/agent-builder-common/agents/prompts';

export const ensureValidInput = ({
  input,
  conversation,
  action,
}: {
  input: ConverseInput;
  conversation?: Conversation;
  action?: ConversationAction;
}) => {
  // Regenerate uses the last round's input via prepareConversation - skip standard input check
  if (action === 'regenerate') {
    return;
  }

  const lastRound = conversation?.rounds[conversation?.rounds.length - 1];
  const lastRoundStatus = lastRound?.status ?? ConversationRoundStatus.completed;

  // standard scenario - we need input to continue
  // form_prompts are a valid continuation even when the last round is completed (Stage 2
  // HITL: handleFormPromptResponse seals the round before executeAgent runs, so the last
  // round is completed by the time this check fires for a form submission).
  if (lastRoundStatus === ConversationRoundStatus.completed) {
    if (!hasStandardInput(input) && !hasFormPromptInput(input)) {
      throw createBadRequestError(`No standard input was provided to continue the conversation.`);
    }
  }

  // prompt pending - we need prompt responses for all pending prompts to continue
  const pendingPrompts = lastRound?.pending_prompts ?? [];
  if (pendingPrompts.length > 0 && lastRoundStatus === ConversationRoundStatus.awaitingPrompt) {
    const submittedFormPromptIds = new Set(input.form_prompts?.map((fp) => fp.id) ?? []);
    const submittedExecutionIds = new Set(input.form_prompts?.map((fp) => fp.execution_id) ?? []);
    const missingResponses = pendingPrompts.filter((p) => {
      if (hasPromptResponse(p.id, input)) return false;
      // Skip prompts newly appended by resumeFormPrompts for the same execution:
      // same execution_id was submitted but this specific step_execution_id was not.
      if (
        isFormPrompt(p) &&
        submittedExecutionIds.has(p.execution_id) &&
        !submittedFormPromptIds.has(p.id)
      ) {
        return false;
      }
      return true;
    });
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

const hasFormPromptInput = (input: ConverseInput): boolean => {
  return (input.form_prompts?.length ?? 0) > 0;
};

const hasPromptResponse = (promptId: string, input: ConverseInput): boolean => {
  const inConfirmationPrompts =
    input.prompts !== undefined && Object.keys(input.prompts).includes(promptId);
  const inFormPrompts =
    input.form_prompts !== undefined && input.form_prompts.some((fp) => fp.id === promptId);
  return inConfirmationPrompts || inFormPrompts;
};
