/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatEvent } from '@kbn/agent-builder-common';
import { isExecutionStartedEvent, isExecutionTerminalEvent } from '@kbn/agent-builder-common';
import { finalize, type Observable } from 'rxjs';
import { isBrowserToolCallEvent } from '@kbn/agent-builder-common/chat/events';
import type { BrowserToolDefinition } from '@kbn/agent-builder-browser/tools/browser_tool';
import type { ConversationActions } from '../conversation/use_conversation_actions';
import type { BrowserToolDispatcher } from '../../../services/browser_tools';

interface SubscribeOptions {
  events$: Observable<ChatEvent>;
  conversationActions: ConversationActions;
  dispatcher?: BrowserToolDispatcher;
  clientId?: string;
  executionId: string;
  agentId: string;
  conversationId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  legacyTools?: Array<BrowserToolDefinition<any>>;
  /** Aborted only when the stream is cancelled or replaced; never on component unmount. */
  streamSignal: AbortSignal;
  isAborted: () => boolean;
}

/**
 * Subscribe to a chat event stream. Live content is folded by `ConversationStreamService`;
 * this only reacts to the events that mean the server has written something (refetch) and to
 * browser tool calls. Returns a Promise that resolves when the stream completes (success or
 * abort) and rejects on a real error.
 */
export const subscribeToChatEvents = ({
  events$,
  conversationActions,
  dispatcher,
  clientId,
  executionId,
  agentId,
  conversationId,
  legacyTools,
  streamSignal,
  isAborted,
}: SubscribeOptions): Promise<void> => {
  const nextChatEvent = (event: ChatEvent) => {
    if (isExecutionStartedEvent(event)) {
      conversationActions.onExecutionStarted();
    } else if (isExecutionTerminalEvent(event)) {
      conversationActions.onExecutionTerminated();
    } else if (isBrowserToolCallEvent(event)) {
      if (dispatcher && clientId) {
        dispatcher.dispatch(event, {
          clientId,
          executionId,
          conversationId,
          agentId,
          legacyTools,
          streamSignal,
        });
      }
    }
  };

  return new Promise<void>((resolve, reject) => {
    events$
      .pipe(
        finalize(() => {
          if (isAborted()) {
            resolve();
          }
        })
      )
      .subscribe({
        next: nextChatEvent,
        complete: () => resolve(),
        error: (err) => {
          if (isAborted()) {
            resolve();
            return;
          }
          reject(err);
        },
      });
  });
};
