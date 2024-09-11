/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation } from '../../../../assistant_context/types';

export const getSelectedConversations = (
  conversationSettings: Record<string, Conversation>,
  systemPromptId: string
) => {
  return Object.values(conversationSettings).filter(
    (conversation) => conversation?.apiConfig?.defaultSystemPromptId === systemPromptId
  );
};
