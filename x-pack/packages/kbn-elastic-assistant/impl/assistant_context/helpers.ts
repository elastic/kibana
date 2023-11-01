/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { WELCOME_CONVERSATION_TITLE } from '../..';

import type { PromptContext } from '../assistant/prompt_context/types';
import { Conversation } from './types';

export const getUniquePromptContextId = (): string => v4();

export const updatePromptContexts = ({
  prevPromptContexts,
  promptContext,
}: {
  prevPromptContexts: Record<string, PromptContext>;
  promptContext: PromptContext;
}): Record<string, PromptContext> => ({
  ...prevPromptContexts,
  [promptContext.id]: {
    ...promptContext,
  },
});

export const isLocalStorageConversationIdValid = (
  localStorageLastConversationId: string | null | undefined,
  assistantBaseConversations: Record<string, Conversation>
) =>
  localStorageLastConversationId && assistantBaseConversations[localStorageLastConversationId]
    ? localStorageLastConversationId
    : WELCOME_CONVERSATION_TITLE;
