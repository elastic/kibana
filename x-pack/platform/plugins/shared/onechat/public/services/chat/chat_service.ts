/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, catchError, throwError, Observable } from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';
import { isSSEError } from '@kbn/sse-utils';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { type ChatAgentEvent, createOnechatError, OnechatErrorCode } from '@kbn/onechat-common';
import type { ChatRequestBodyPayload } from '../../../common/http_api/chat';

export type ChatParams = ChatRequestBodyPayload;

export class ChatService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  chat({
    agentId,
    connectorId,
    conversationId,
    nextMessage,
  }: ChatParams): Observable<ChatAgentEvent> {
    return defer(() => {
      return this.http.post('/internal/onechat/chat', {
        asResponse: true,
        rawResponse: true,
        body: JSON.stringify({ agentId, connectorId, conversationId, nextMessage }),
      });
    }).pipe(
      // @ts-expect-error SseEvent mixin issue
      httpResponseIntoObservable<ChatAgentEvent>(), // TODO: ChatEvents
      // TODO: factorize
      catchError((err) => {
        if (isSSEError(err)) {
          return throwError(() =>
            createOnechatError(err.code as OnechatErrorCode, err.message, err.meta)
          );
        }
        return throwError(() => err);
      })
    );
  }
}
