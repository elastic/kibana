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

/**
 * One entry per AI index whose page has opened the assistant, so the page can say what is already
 * going rather than offering a button that quietly starts again.
 *
 * The conversation id is kept in `localStorage` because that is the same scope Agent Builder's own
 * `sessionTag` restoration uses — per user, per browser. Recording it on the AI index instead would
 * publish one person's conversation to everyone with access to that index.
 *
 * `isRunning` is deliberately not persisted. It is a live reading taken from the event stream, and
 * the stream only reaches us while the sidebar is mounted; after a reload we have no way to know
 * whether the run we last saw is still going, and claiming otherwise would be a guess.
 */
const STORAGE_PREFIX = 'contextEngine.aiIndexConversation.';

/**
 * How long a conversation may go without producing an event before it stops counting as running.
 *
 * Closing the sidebar tears the event stream down without a final event, so without this a run the
 * user walked away from would be reported as working forever. A model can legitimately think for a
 * while between events, hence minutes rather than seconds.
 */
export const CONVERSATION_IDLE_AFTER_MS = 2 * 60 * 1000;

const IDLE: AiIndexConversationState = { isRunning: false };

export interface AiIndexConversationTracker {
  /**
   * Declares that the conversation the sidebar settles on next belongs to this AI index.
   *
   * Called as the sidebar is opened rather than resolved afterwards, because the id only appears
   * once the user sends something, which can be much later — or never.
   */
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
      // A browser with storage disabled loses the binding across reloads, which costs a resumed
      // conversation and nothing else.
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
      // See readStored: losing the binding is recoverable, failing the click is not.
    }
    patch(aiIndexId, { conversationId });
  };

  const subscriptions = agentBuilder?.events
    ? [
        // Binding happens here rather than at open time: the conversation has no id until the
        // user sends, and until then there is nothing to remember.
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

            // Any other event means the agent is still producing. Which kind it is does not
            // matter: the page only needs to know that something is happening.
            markRunning(aiIndexId);
          }),
      ]
    : [];

  return {
    bindNextConversation: (aiIndexId) => {
      pendingAiIndexId = aiIndexId;
      // Touch the entry so a stored id is loaded before the first subscriber asks for it.
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
