/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ResolveConversationIdParams {
  isNewConversation?: boolean;
  conversationId?: string;
  persistedConversationId?: string;
}

export const resolveConversationId = ({
  isNewConversation,
  conversationId,
  persistedConversationId,
}: ResolveConversationIdParams): string | undefined => {
  if (isNewConversation) return undefined;
  if (conversationId) return conversationId;
  return persistedConversationId;
};
