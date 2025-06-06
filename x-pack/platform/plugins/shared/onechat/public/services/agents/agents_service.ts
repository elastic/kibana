/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defer, Observable } from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { type ChatAgentEvent } from '@kbn/onechat-common';
import type { CallAgentResponse } from '../../../common/http_api/agents';
import { unwrapOnechatErrors } from '../utils/errors';

export class AgentService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  /**
   * Call an agent and await the final execution result.
   */
  async call({ agentId, agentParams }: { agentId: string; agentParams: Record<string, unknown> }) {
    return await this.http.get<CallAgentResponse>('/internal/onechat/agents/invoke');
  }

  /**
   * Call an agent and stream the events.
   */
  stream({
    agentId,
    agentParams,
  }: {
    agentId: string;
    agentParams: Record<string, unknown>;
  }): Observable<ChatAgentEvent> {
    return defer(() => {
      return this.http.post('/internal/onechat/agents/stream', {
        asResponse: true,
        rawResponse: true,
        body: JSON.stringify({ agentId, agentParams }),
      });
    }).pipe(
      // @ts-expect-error SseEvent mixin issue
      httpResponseIntoObservable<ChatAgentEvent>(),
      unwrapOnechatErrors()
    );
  }
}
