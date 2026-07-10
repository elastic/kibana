/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export const MAX_MESSAGE_QUEUE_SIZE = 3;

export interface ConversationMessageQueueContextValue {
  queues: ReadonlyMap<string, readonly string[]>;
  enqueue: (conversationId: string, message: string) => void;
  remove: (conversationId: string, index: number) => void;
  clear: (conversationId: string) => void;
  isMessageQueueFull: (conversationId: string) => boolean;
}

const ConversationMessageQueueContext = createContext<ConversationMessageQueueContextValue | null>(
  null
);

export const ConversationMessageQueueProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [queues, setQueues] = useState<Map<string, string[]>>(() => new Map());

  const enqueue = useCallback((conversationId: string, message: string) => {
    setQueues((prev) => {
      const current = prev.get(conversationId) ?? [];
      if (current.length >= MAX_MESSAGE_QUEUE_SIZE) return prev;
      const next = new Map(prev);
      next.set(conversationId, [...current, message]);
      return next;
    });
  }, []);

  const remove = useCallback((conversationId: string, index: number) => {
    setQueues((prev) => {
      const current = prev.get(conversationId);
      if (!current || index < 0 || index >= current.length) return prev;
      const filtered = current.filter((_, i) => i !== index);
      const next = new Map(prev);
      if (filtered.length === 0) {
        next.delete(conversationId);
      } else {
        next.set(conversationId, filtered);
      }
      return next;
    });
  }, []);

  const clear = useCallback((conversationId: string) => {
    setQueues((prev) => {
      if (!prev.has(conversationId)) return prev;
      const next = new Map(prev);
      next.delete(conversationId);
      return next;
    });
  }, []);

  const isMessageQueueFull = useCallback(
    (conversationId: string): boolean => {
      const current = queues.get(conversationId);
      return (current?.length ?? 0) >= MAX_MESSAGE_QUEUE_SIZE;
    },
    [queues]
  );

  const value = useMemo<ConversationMessageQueueContextValue>(
    () => ({ queues, enqueue, remove, clear, isMessageQueueFull }),
    [queues, enqueue, remove, clear, isMessageQueueFull]
  );

  return (
    <ConversationMessageQueueContext.Provider value={value}>
      {children}
    </ConversationMessageQueueContext.Provider>
  );
};

export const useConversationMessageQueue = (): ConversationMessageQueueContextValue => {
  const ctx = useContext(ConversationMessageQueueContext);
  if (!ctx) {
    throw new Error(
      'useConversationMessageQueue must be used within a ConversationMessageQueueProvider'
    );
  }
  return ctx;
};
