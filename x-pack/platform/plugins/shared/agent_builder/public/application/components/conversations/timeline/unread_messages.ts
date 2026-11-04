/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from './types';

/** Keys of the messages no run has read yet: none was started by them or after them. */
export const unreadMessageKeys = (items: TimelineItem[]): Set<string> => {
  const runs = items.filter((item) => item.kind === 'agentTurn');
  const triggers = new Set(runs.map((run) => run.triggerEventId));
  const unread = new Set<string>();

  for (const item of items) {
    if (
      (item.kind === 'userMessage' || item.kind === 'agentMessage') &&
      !triggers.has(item.key) &&
      !runs.some((run) => run.startedAt > item.event.created_at)
    ) {
      unread.add(item.key);
    }
  }
  return unread;
};
