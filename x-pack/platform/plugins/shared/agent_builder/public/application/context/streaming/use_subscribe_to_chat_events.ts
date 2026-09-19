/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatEvent } from '@kbn/agent-builder-common';
import { isExecutionStartedEvent, isExecutionTerminatedEvent } from '@kbn/agent-builder-common';
import { finalize, type Observable } from 'rxjs';
import { isBrowserToolCallEvent } from '@kbn/agent-builder-common/chat/events';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { ConversationActions } from '../conversation/use_conversation_actions';
import type { BrowserToolExecutor } from '../../services/browser_tool_executor';

interface SubscribeOptions {
  events$: Observable<ChatEvent>;
  conversationActions: ConversationActions;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
  browserToolExecutor?: BrowserToolExecutor;
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
  browserApiTools,
  browserToolExecutor,
  isAborted,
}: SubscribeOptions): Promise<void> => {
  const nextChatEvent = (event: ChatEvent) => {
    if (isExecutionStartedEvent(event)) {
      conversationActions.onExecutionStarted();
    } else if (isExecutionTerminatedEvent(event)) {
      conversationActions.onExecutionTerminated();
    } else if (isBrowserToolCallEvent(event)) {
      const toolId = event.data.tool_id;
      if (toolId && browserToolExecutor && browserApiTools) {
        const toolDef = browserApiTools.find((tool) => tool.id === toolId);
        if (toolDef) {
          const toolsMap = new Map([[toolId, toolDef]]);
          browserToolExecutor
            .executeToolCalls(
              [
                {
                  tool_id: toolId,
                  call_id: event.data.tool_call_id,
                  params: event.data.params,
                  timestamp: Date.now(),
                },
              ],
              toolsMap
            )
            .catch((error) => {
              // eslint-disable-next-line no-console
              console.error('Failed to execute browser tool:', error);
            });
        }
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
