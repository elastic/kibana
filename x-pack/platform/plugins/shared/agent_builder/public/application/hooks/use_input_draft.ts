/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

const IMAGE_LINK_RE = /\[[^\]]*\]\(image:\/\/[^)]*\)/g;

interface DraftOwner {
  spaceId: string;
  sessionTag: string | undefined;
  username: string | undefined;
  agentId: string | undefined;
}

/** The storage key of a draft, or null when it can't be told whose draft it is. */
const getDraftKey = (
  { spaceId, sessionTag, username, agentId }: DraftOwner,
  conversationId: string | undefined
): string | null =>
  username && agentId
    ? `agent-builder:draft:${encodeURIComponent(spaceId)}:${encodeURIComponent(
        sessionTag ?? 'default'
      )}:${encodeURIComponent(username)}:${encodeURIComponent(agentId)}:${
        conversationId ? encodeURIComponent(conversationId) : 'new'
      }`
    : null;

const getFromStorage = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeToStorage = (key: string, content: string): void => {
  try {
    sessionStorage.setItem(key, content);
  } catch {
    // SecurityError or QuotaExceededError — best effort only
  }
};

const removeFromStorage = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // SecurityError — best effort only
  }
};

/** Reads and writes a per-conversation input draft to `sessionStorage`. */
export const useInputDraft = ({
  spaceId,
  sessionTag,
  username,
  agentId,
  conversationId,
}: DraftOwner & { conversationId: string | undefined }) => {
  const key = getDraftKey({ spaceId, sessionTag, username, agentId }, conversationId);

  const draft = key ? getFromStorage(key) : null;

  const saveDraft = useCallback(
    (content: string) => {
      if (!key) return;
      const stripped = content.replace(IMAGE_LINK_RE, '');
      if (stripped.trim()) {
        writeToStorage(key, stripped);
      } else {
        removeFromStorage(key);
      }
    },
    [key]
  );

  const clearDraft = useCallback(() => {
    if (key) removeFromStorage(key);
  }, [key]);

  return { draft, saveDraft, clearDraft };
};

/**
 * Moves what was typed in a new chat to the input of the conversation that starts from it, for when
 * the conversation is started without sending that text, e.g. by a conversation starter.
 */
export const useCarryOverDraft = ({ spaceId, sessionTag, username, agentId }: DraftOwner) => {
  /** Returns the draft of the new chat and removes it, so it doesn't come back in the next new chat. */
  const takeNewChatDraft = useCallback((): string | null => {
    const key = getDraftKey({ spaceId, sessionTag, username, agentId }, undefined);
    if (!key) return null;
    const draft = getFromStorage(key);
    removeFromStorage(key);
    return draft;
  }, [spaceId, sessionTag, username, agentId]);

  /** Stores a draft for a conversation, read by its input when it opens. */
  const saveDraftTo = useCallback(
    (conversationId: string, content: string) => {
      const key = getDraftKey({ spaceId, sessionTag, username, agentId }, conversationId);
      if (key && content.trim()) writeToStorage(key, content);
    },
    [spaceId, sessionTag, username, agentId]
  );

  return { takeNewChatDraft, saveDraftTo };
};
