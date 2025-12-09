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
} from '@kbn/agent-builder-common';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { AgentsServiceStart } from '../../agents';

export const executeAgent$ = ({
  agentId,
  request,
  capabilities,
  agentService,
  conversation,
  nextInput,
  abortSignal,
  defaultConnectorId,
  browserApiTools,
}: {
  agentId: string;
  request: KibanaRequest;
  capabilities?: AgentCapabilities;
  agentService: AgentsServiceStart;
  conversation: Conversation;
  nextInput: RawRoundInput;
  abortSignal?: AbortSignal;
  defaultConnectorId?: string;
  browserApiTools?: BrowserApiToolMetadata[];
}): Observable<ChatAgentEvent> => {
  return new Observable<ChatAgentEvent>((observer) => {
    agentService
      .execute({
        request,
        agentId,
        abortSignal,
        defaultConnectorId,
        agentParams: {
          nextInput,
          conversation,
          capabilities,
          browserApiTools,
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
