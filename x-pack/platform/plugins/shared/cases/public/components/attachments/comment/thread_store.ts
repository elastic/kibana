/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';

let openThreadId: string | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => openThreadId;

/** Opens the thread flyout of a comment; only one thread is open at a time. */
export const setOpenThread = (commentId: string | null): void => {
  openThreadId = commentId;
  listeners.forEach((listener) => listener());
};

/** Closes the thread flyout if it belongs to the comment. */
export const closeThread = (commentId: string): void => {
  if (openThreadId === commentId) {
    setOpenThread(null);
  }
};

export const useOpenThreadId = (): string | null => useSyncExternalStore(subscribe, getSnapshot);
