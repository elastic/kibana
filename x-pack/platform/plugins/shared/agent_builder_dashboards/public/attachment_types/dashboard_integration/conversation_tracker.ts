/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ConversationChange = 'none' | 'identified' | 'switched';

export interface ConversationTracker {
  getActiveId: () => string | undefined;
  /** Counts switches to another conversation; a new conversation getting its id is not one. */
  getSwitchCount: () => number;
  setActiveId: (conversationId: string | undefined) => ConversationChange;
}

export const createConversationTracker = (): ConversationTracker => {
  let activeId: string | undefined;
  let switchCount = 0;

  return {
    getActiveId: () => activeId,
    getSwitchCount: () => switchCount,
    setActiveId: (conversationId) => {
      // a new conversation gets its id once its first message is sent
      const change: ConversationChange =
        activeId === undefined && conversationId !== undefined
          ? 'identified'
          : conversationId !== activeId
          ? 'switched'
          : 'none';
      if (change === 'switched') {
        switchCount++;
      }
      activeId = conversationId;
      return change;
    },
  };
};
