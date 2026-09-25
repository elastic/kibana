/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

const IMAGE_LINK_RE = /\[[^\]]*\]\(image:\/\/[^)]*\)/g;

const buildKey = (
  spaceId: string,
  sessionTag: string,
  username: string,
  agentId: string,
  conversationId: string | undefined
) =>
  `agent-builder:draft:${encodeURIComponent(spaceId)}:${encodeURIComponent(
    sessionTag
  )}:${encodeURIComponent(username)}:${encodeURIComponent(agentId)}:${
    conversationId ? encodeURIComponent(conversationId) : 'new'
  }`;

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
  } catch {}
};

const removeFromStorage = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch {}
};

/** Reads and writes a per-conversation input draft to `sessionStorage`. */
export const useInputDraft = ({
  spaceId,
  sessionTag,
  username,
  agentId,
  conversationId,
}: {
  spaceId: string;
  sessionTag: string | undefined;
  username: string | undefined;
  agentId: string | undefined;
  conversationId: string | undefined;
}) => {
  const key =
    username && agentId
      ? buildKey(spaceId, sessionTag ?? 'default', username, agentId, conversationId)
      : null;

  const draft = key ? getFromStorage(key) : null;

  const saveDraft = useCallback(
    (content: string) => {
      if (!key) return;
      const stripped = content.replace(IMAGE_LINK_RE, '').trim();
      if (stripped) {
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
