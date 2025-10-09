/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Manages persistence of the last conversation used in the flyout
 */

const STORAGE_KEY = 'onechat:flyout:lastConversation';

interface FlyoutConversationState {
  conversationId: string;
  agentId?: string;
}

/**
 * Store the last conversation ID and agent ID used in the flyout
 */
export const storeFlyoutConversation = (conversationId: string, agentId?: string): void => {
  try {
    const state: FlyoutConversationState = {
      conversationId,
      agentId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Silently fail if localStorage is not available
  }
};

/**
 * Retrieve the last conversation state from the flyout
 */
export const getFlyoutConversation = (): FlyoutConversationState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as FlyoutConversationState;
  } catch (error) {
    return null;
  }
};

/**
 * Clear the stored flyout conversation
 */
export const clearFlyoutConversation = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Silently fail if localStorage is not available
  }
};

/**
 * Determine the conversation ID to use when opening the flyout
 */
export const resolveConversationId = ({
  conversationId,
  agentId,
  newChat,
}: {
  conversationId?: string;
  agentId?: string;
  newChat?: boolean;
}): string | undefined => {
  // If conversationId is explicitly provided, use it
  if (conversationId) {
    return conversationId;
  }

  // If newChat is true, start a new conversation
  if (newChat) {
    return undefined;
  }

  // Try to restore the last conversation
  const lastConversation = getFlyoutConversation();
  if (!lastConversation) {
    return undefined;
  }

  // If agentId is specified and differs from the stored agent, start a new conversation
  if (agentId && lastConversation.agentId && agentId !== lastConversation.agentId) {
    return undefined;
  }

  // Restore the last conversation
  return lastConversation.conversationId;
};

