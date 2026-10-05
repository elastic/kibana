/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, concatMap, from, map, of, type OperatorFunction } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { isMessageChunkEvent, type ChatEvent } from '@kbn/agent-builder-common';
import { HookLifecycle, type HooksServiceStart } from '@kbn/agent-builder-server';
import type { ConversationAgentExecution } from '@kbn/agent-builder-server/execution';

/**
 * Runs `afterChatEvent` hooks on every event of a type some hook handles, and emits the event they
 * return. Other events go through without waiting. Order is always kept. A failing hook is logged and its event goes through unchanged, so hooks never
 * break the stream.
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
}): OperatorFunction<ChatEvent, ChatEvent> =>
  concatMap((event) => {
    if (isMessageChunkEvent(event) || !hooks.handles(HookLifecycle.afterChatEvent, event.type)) {
      return of(event);
    }

    return from(
      hooks.run(HookLifecycle.afterChatEvent, {
        request,
        abortSignal,
        execution,
        event,
      })
    ).pipe(
      map(({ event: updatedEvent }): ChatEvent => updatedEvent),
      catchError((error) => {
        if (!abortSignal.aborted) {
          logger.warn(`afterChatEvent hooks failed on "${event.type}" event: ${error}`);
        }

        return of(event);
      })
    );
  });
