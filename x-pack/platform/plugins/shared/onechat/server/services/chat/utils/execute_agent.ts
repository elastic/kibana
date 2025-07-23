/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shareReplay, switchMap, Observable } from 'rxjs';
import { KibanaRequest } from '@kbn/core-http-server';
import {
  AgentMode,
  type RoundInput,
  type Conversation,
  type ChatAgentEvent,
} from '@kbn/onechat-common';
import type { AgentsServiceStart } from '../../agents';

export const executeAgent$ = ({
  agentId,
  request,
  agentService,
  conversation$,
  mode,
  nextInput,
  abortSignal,
}: {
  agentId: string;
  request: KibanaRequest;
  agentService: AgentsServiceStart;
  conversation$: Observable<Conversation>;
  mode: AgentMode;
  nextInput: RoundInput;
  abortSignal?: AbortSignal;
}): Observable<ChatAgentEvent> => {
  return conversation$.pipe(
    switchMap((conversation) => {
      return new Observable<ChatAgentEvent>((observer) => {
        agentService
          .execute({
            request,
            agentId,
            abortSignal,
            agentParams: {
              agentMode: mode,
              nextInput,
              conversation: conversation.rounds,
            },
            onEvent: (event) => {
              observer.next(event);
            },
          })
          .then(
            () => {
              observer.complete();
            },
            (err) => {
              observer.error(err);
            }
          );

        return () => {};
      });
    }),
    shareReplay()
  );
};
