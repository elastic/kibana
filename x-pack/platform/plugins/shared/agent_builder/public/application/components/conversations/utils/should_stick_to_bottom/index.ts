/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ShouldStickToBottomNowParams {
  conversationId: string | undefined;
  inboxEnabled: boolean;
  isAwaitingPrompt: boolean;
  isFetched: boolean;
  shouldStickToBottom: boolean;
}

export const shouldStickToBottomNow = ({
  conversationId,
  inboxEnabled,
  isAwaitingPrompt,
  isFetched,
  shouldStickToBottom,
}: ShouldStickToBottomNowParams): boolean =>
  isFetched && !!conversationId && shouldStickToBottom && (!inboxEnabled || !isAwaitingPrompt);
