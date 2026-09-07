/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AiIndexConversationState } from '@kbn/context-engine-plugin/public/types';
import { BehaviorSubject, EMPTY, map, switchMap, type Observable } from 'rxjs';

const STORAGE_PREFIX = 'contextEngine.aiIndexConversation.';

/** How long a conversation may go without producing an event before it stops counting as running. */
export const CONVERSATION_IDLE_AFTER_MS = 2 * 60 * 1000;

const IDLE: AiIndexConversationState = { isRunning: false };

/** Tracks which conversation belongs to which AI index, and whether its agent is working. */
export interface AiIndexConversationTracker {
  /** Declares that the conversation the sidebar settles on next belongs to this AI index. */
  bindNextConversation: (aiIndexId: string) => void;
  state$: (aiIndexId: string) => Observable<AiIndexConversationState>;
  getConversationId: (aiIndexId: string) => string | undefined;
  stop: () => void;
}

export const createAiIndexConversationTracker = ({
  agentBuilder,
  storage,
}: {
  agentBuilder: AgentBuilderPluginStart | undefined;
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined;
}): AiIndexConversationTracker => {
  const states = new Map<string, BehaviorSubject<AiIndexConversationState>>();
  const aiIndexIdByConversation = new Map<string, string>();
  const idleTimers = new Map<string, ReturnType<typeof setTimeout>>();

  let pendingAiIndexId: string | undefined;

  const readStored = (aiIndexId: string): string | undefined => {
    try {
      return storage?.getItem(`${STORAGE_PREFIX}${aiIndexId}`) ?? undefined;
    } catch {
      return undefined;
    }
  };

  const stateFor = (aiIndexId: string): BehaviorSubject<AiIndexConversationState> => {
    const existing = states.get(aiIndexId);
    if (existing) {
      return existing;
    }

    const conversationId = readStored(aiIndexId);
    if (conversationId) {
      aiIndexIdByConversation.set(conversationId, aiIndexId);
    }

    const subject = new BehaviorSubject<AiIndexConversationState>(
      conversationId ? { conversationId, isRunning: false } : IDLE
    );
    states.set(aiIndexId, subject);
    return subject;
  };

  const patch = (aiIndexId: string, changes: Partial<AiIndexConversationState>): void => {
    const subject = stateFor(aiIndexId);
    const next = { ...subject.getValue(), ...changes };
    const current = subject.getValue();

    if (next.conversationId === current.conversationId && next.isRunning === current.isRunning) {
      return;
    }

    subject.next(next);
  };

  const markIdle = (aiIndexId: string): void => {
    clearTimeout(idleTimers.get(aiIndexId));
    idleTimers.delete(aiIndexId);
    patch(aiIndexId, { isRunning: false });
  };

  const markRunning = (aiIndexId: string): void => {
    clearTimeout(idleTimers.get(aiIndexId));
    idleTimers.set(
      aiIndexId,
      setTimeout(() => markIdle(aiIndexId), CONVERSATION_IDLE_AFTER_MS)
    );
    patch(aiIndexId, { isRunning: true });
  };

  const bind = (aiIndexId: string, conversationId: string): void => {
    aiIndexIdByConversation.set(conversationId, aiIndexId);
    try {
      storage?.setItem(`${STORAGE_PREFIX}${aiIndexId}`, conversationId);
    } catch {
      // A browser with storage disabled keeps the binding for this page only.
    }
    patch(aiIndexId, { conversationId });
  };

  const subscriptions = agentBuilder?.events
    ? [
        agentBuilder.events.ui.activeConversation$.subscribe((conversation) => {
          const conversationId = conversation?.id;
          if (!conversationId || !pendingAiIndexId) {
            return;
          }

          bind(pendingAiIndexId, conversationId);
          pendingAiIndexId = undefined;
        }),

        agentBuilder.events.ui.activeConversation$
          .pipe(
            switchMap((conversation) =>
              conversation?.id
                ? agentBuilder.events
                    .getChatEvents$(conversation.id)
                    .pipe(map((event) => ({ conversationId: conversation.id as string, event })))
                : EMPTY
            )
          )
          .subscribe(({ conversationId, event }) => {
            const aiIndexId = aiIndexIdByConversation.get(conversationId);
            if (!aiIndexId) {
              return;
            }

            if (isRoundCompleteEvent(event)) {
              markIdle(aiIndexId);
              return;
            }

            markRunning(aiIndexId);
          }),
      ]
    : [];

  return {
    bindNextConversation: (aiIndexId) => {
      pendingAiIndexId = aiIndexId;
      stateFor(aiIndexId);
    },
    state$: (aiIndexId) => stateFor(aiIndexId).asObservable(),
    getConversationId: (aiIndexId) => stateFor(aiIndexId).getValue().conversationId,
    stop: () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
      idleTimers.forEach((timer) => clearTimeout(timer));
      idleTimers.clear();
    },
  };
};
