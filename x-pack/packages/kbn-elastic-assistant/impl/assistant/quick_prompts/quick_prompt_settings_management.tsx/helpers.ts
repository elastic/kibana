/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation } from '../../../..';
import { Prompt } from '../../types';

export const getSelectedConversations = (
  conversationSettings: Record<string, Conversation>,
  systemPromptId: string
) =>
  Object.values(conversationSettings).filter(
    (conversation) => conversation.apiConfig?.defaultSystemPromptId === systemPromptId
  );

export const getSystemPromptsList = (
  systemPromptSettings: Prompt[],
  conversationSettings: Record<string, Conversation>
): Array<Prompt & { defaultConversations: string[] }> => {
  return systemPromptSettings.map((systemPrompt) => {
    return {
      ...systemPrompt,
      defaultConversations: getSelectedConversations(conversationSettings, systemPrompt.id).map(
        ({ title }) => title
      ),
    };
  });
};
