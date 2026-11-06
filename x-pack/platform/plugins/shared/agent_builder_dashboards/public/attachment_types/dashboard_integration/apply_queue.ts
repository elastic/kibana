/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { ConversationTracker } from './conversation_tracker';

/**
 * Runs applies one at a time, so the dashboard is never compared while it is applying. An apply
 * still queued when the active conversation changes is dropped.
 */
export const createApplyQueue = (conversation: ConversationTracker) => {
  const applyFinished = new Subject<void>();
  let pendingApplies = 0;
  let lastApply: Promise<void> = Promise.resolve();

  return {
    queueApply: (apply: () => Promise<void>): Promise<void> => {
      const conversationSwitch = conversation.getSwitchCount();
      const applyInConversation = () =>
        conversationSwitch === conversation.getSwitchCount() ? apply() : Promise.resolve();
      // an idle queue starts the apply right away, so the dashboard updates in the same tick
      const isIdle = pendingApplies++ === 0;
      const queuedApply = (
        isIdle ? applyInConversation() : lastApply.then(applyInConversation)
      ).finally(() => {
        pendingApplies--;
        applyFinished.next();
      });
      lastApply = queuedApply.catch(() => undefined);
      return queuedApply;
    },
    isApplying: () => pendingApplies > 0,
    applyFinished$: applyFinished.asObservable(),
  };
};
