/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Which conversations have their details flyout open, and a way to ask an open one to show another
 * tab. A card that wants "the Impact map tab" then switches the tab of the flyout that is already
 * there instead of opening a second flyout, which reloads the whole thing.
 */
const open = new Map<string, number>();
type TabRequestListener = (conversationId: string, tabId: string) => void;
const listeners = new Set<TabRequestListener>();

export const registerOpenDetailsFlyout = (conversationId: string): (() => void) => {
  open.set(conversationId, (open.get(conversationId) ?? 0) + 1);
  return () => {
    const remaining = (open.get(conversationId) ?? 1) - 1;
    if (remaining > 0) {
      open.set(conversationId, remaining);
    } else {
      open.delete(conversationId);
    }
  };
};

export const isDetailsFlyoutOpen = (conversationId: string): boolean => open.has(conversationId);

export const requestDetailsTab = (conversationId: string, tabId: string): void => {
  listeners.forEach((listener) => listener(conversationId, tabId));
};

export const subscribeToDetailsTabRequests = (listener: TabRequestListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
