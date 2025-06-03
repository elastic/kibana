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

export class AgentService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  // async call({ agentId }: { agentId: string }) {
  //   return await this.http.get<GetAgentResponse>(`/internal/workchat/agents/${agentId}`);
  // }

  stream({
    agentId,
    agentParams,
  }: {
    agentId: string;
    agentParams: Record<string, unknown>;
  }): Observable<ChatAgentEvent> {
    return defer(() => {
      return this.http.post('/api/onechat/agents/stream', {
        asResponse: true,
        rawResponse: true,
        body: JSON.stringify({ agentId, agentParams }),
      });
    }).pipe(
      // @ts-expect-error SseEvent mixin issue
      httpResponseIntoObservable<ChatAgentEvent>(),
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
