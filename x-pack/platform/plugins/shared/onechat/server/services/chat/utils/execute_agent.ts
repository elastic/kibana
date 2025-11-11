/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, shareReplay } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  RawRoundInput,
  Conversation,
  ChatAgentEvent,
  AgentCapabilities,
} from '@kbn/onechat-common';
import type { AgentsServiceStart } from '../../agents';
import type { CheckpointerService } from '../../checkpointer';

export const executeAgent$ = ({
  agentId,
  request,
  capabilities,
  agentService,
  conversation,
  nextInput,
  abortSignal,
  defaultConnectorId,
  checkpointerService,
}: {
  agentId: string;
  request: KibanaRequest;
  capabilities?: AgentCapabilities;
  agentService: AgentsServiceStart;
  conversation: Conversation;
  nextInput: RawRoundInput;
  abortSignal?: AbortSignal;
  defaultConnectorId?: string;
  checkpointerService: CheckpointerService;
}): Observable<ChatAgentEvent> => {
  return new Observable<ChatAgentEvent>((observer) => {
    agentService
      .execute({
        request,
        agentId,
        abortSignal,
        defaultConnectorId,
        checkpointerService,
        agentParams: {
          nextInput,
          conversation: conversation,
          capabilities,
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
  }).pipe(shareReplay());
};
