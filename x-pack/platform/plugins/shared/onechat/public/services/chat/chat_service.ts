/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, Observable } from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import type { ChatEvent } from '@kbn/onechat-common';
import type { ChatRequestBodyPayload } from '../../../common/http_api/chat';
import { unwrapOnechatErrors } from '../utils/errors';

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
    mode,
  }: ChatParams): Observable<ChatEvent> {
    return defer(() => {
      return this.http.post('/internal/onechat/chat', {
        query: { stream: true },
        asResponse: true,
        rawResponse: true,
        body: JSON.stringify({ agentId, mode, connectorId, conversationId, nextMessage }),
      });
    }).pipe(
      // @ts-expect-error SseEvent mixin issue
      httpResponseIntoObservable<ChatEvent>(),
      unwrapOnechatErrors()
    );
  }
}
