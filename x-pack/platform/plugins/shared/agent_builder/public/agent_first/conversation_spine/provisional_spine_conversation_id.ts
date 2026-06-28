/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Stable id for spine UI before a conversation is persisted (new-chat route). */
export const PROVISIONAL_SPINE_CONVERSATION_ID = 'provisional-new-conversation';

export const getSpineConversationId = (conversationId: string | undefined): string =>
  conversationId ?? PROVISIONAL_SPINE_CONVERSATION_ID;
