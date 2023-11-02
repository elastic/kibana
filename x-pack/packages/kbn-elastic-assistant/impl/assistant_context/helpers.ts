/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';

import type { PromptContext } from '../assistant/prompt_context/types';
import { WELCOME_CONVERSATION_TITLE } from '../assistant/use_conversation/translations';
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

const dataQualityPageExists = (
  conversations: Record<string, Conversation>,
  dataQualityConversationId: string
) => conversations[dataQualityConversationId] != null;

export const isLocalStorageConversationIdValid = ({
  conversationId,
  conversations,
  dataQualityConversationId,
}: {
  conversationId: string | null | undefined;
  conversations: Record<string, Conversation>;
  dataQualityConversationId: string;
}) =>
  dataQualityPageExists(conversations, dataQualityConversationId)
    ? true
    : conversationId !== dataQualityConversationId;

export const validateLocalStorageLastConversationId = ({
  conversationId,
  conversations,
  dataQualityConversationId,
}: {
  conversationId: string | undefined;
  conversations: Record<string, Conversation>;
  dataQualityConversationId: string;
}) =>
  isLocalStorageConversationIdValid({ conversationId, conversations, dataQualityConversationId })
    ? conversationId
    : WELCOME_CONVERSATION_TITLE;
