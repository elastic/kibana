/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, distinctUntilChanged, switchMap, catchError, type Observable } from 'rxjs';
import type { AgentBuilderPluginStart, BrowserChatEvent } from '@kbn/agent-builder-browser';

/**
 * The events of the conversation that is open in the chat, whichever it is, and the next one when
 * another is opened. A conversation whose events cannot be had is one that gives none.
 */
export const getChatEvents$ = (
  agentBuilder: AgentBuilderPluginStart
): Observable<BrowserChatEvent> =>
  agentBuilder.events.ui.activeConversation$.pipe(
    distinctUntilChanged((previous, next) => previous?.id === next?.id),
    switchMap((conversation) =>
      conversation?.id
        ? agentBuilder.events.getChatEvents$(conversation.id).pipe(catchError(() => EMPTY))
        : EMPTY
    )
  );
