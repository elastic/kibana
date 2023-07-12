/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation, Prompt } from '../../../..';

/**
 * Returns a conversation's default system prompt, or the default system prompt if the conversation does not have one.
 * @param allSystemPrompts
 * @param conversation
 * @param defaultSystemPrompt
 */
export const getDefaultSystemPromptFromConversation = ({
  allSystemPrompts,
  conversation,
  defaultSystemPrompt,
}: {
  conversation: Conversation | undefined;
  allSystemPrompts: Prompt[];
  defaultSystemPrompt: Prompt;
}) => {
  const convoDefaultSystemPromptId = conversation?.apiConfig.defaultSystemPromptId;
  if (convoDefaultSystemPromptId && allSystemPrompts) {
    return (
      allSystemPrompts.find((prompt) => prompt.id === convoDefaultSystemPromptId) ??
      defaultSystemPrompt
    );
  }
  return allSystemPrompts.find((prompt) => prompt.isNewConversationDefault) ?? defaultSystemPrompt;
};
