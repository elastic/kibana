/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  catchError,
  concatMap,
  dematerialize,
  from,
  map,
  materialize,
  of,
  type OperatorFunction,
} from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { isMessageChunkEvent, type ChatEvent } from '@kbn/agent-builder-common';
import { HookLifecycle, type HooksServiceStart } from '@kbn/agent-builder-server';
import type { ConversationAgentExecution } from '@kbn/agent-builder-server/execution';

/**
 * Runs `afterChatEvent` hooks on every event except message chunks, and emits the event they
 * return. Message chunks go through without waiting. Order is always kept, and a source error or
 * completion waits for the events ahead of it, so no event is dropped while its hooks run. A
 * failing hook is logged and its event goes through unchanged, so hooks never break the stream.
 */
export const runAfterChatEventHooks = ({
  hooks,
  request,
  abortSignal,
  execution,
  logger,
}: {
  hooks: HooksServiceStart;
  request: KibanaRequest;
  abortSignal: AbortSignal;
  execution: ConversationAgentExecution;
  logger: Logger;
}): OperatorFunction<ChatEvent, ChatEvent> => {
  const runHooks = (event: ChatEvent) => {
    if (isMessageChunkEvent(event)) {
      return of(event);
    }

    return from(
      hooks.run(HookLifecycle.afterChatEvent, { request, abortSignal, execution, event })
    ).pipe(
      map(({ event: updatedEvent }): ChatEvent => updatedEvent),
      catchError((error) => {
        if (!abortSignal.aborted) {
          logger.warn(`afterChatEvent hooks failed on "${event.type}" event: ${error}`);
        }

        return of(event);
      })
    );
  };

  return (source$) =>
    source$.pipe(
      // Queue errors and completion behind events whose hooks are still running.
      materialize(),
      concatMap((notification) =>
        notification.kind === 'N'
          ? runHooks(notification.value).pipe(map((value) => ({ kind: 'N' as const, value })))
          : of(notification)
      ),
      dematerialize()
    );
};
