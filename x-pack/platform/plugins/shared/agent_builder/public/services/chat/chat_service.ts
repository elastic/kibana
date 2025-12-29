/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { defer } from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import type { ChatEvent, AgentCapabilities } from '@kbn/agent-builder-common';
import { getKibanaDefaultAgentCapabilities } from '@kbn/agent-builder-common/agents';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { publicApiPath } from '../../../common/constants';
import type { ChatRequestBodyPayload } from '../../../common/http_api/chat';
import { unwrapAgentBuilderErrors } from '../utils/errors';

export interface ChatParams {
  signal?: AbortSignal;
  agentId?: string;
  connectorId?: string;
  conversationId?: string;
  capabilities?: AgentCapabilities;
  input: string;
  attachments?: AttachmentInput[];
  browserApiTools?: BrowserApiToolMetadata[];
}

export class ChatService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  chat(params: ChatParams): Observable<ChatEvent> {
    const payload: ChatRequestBodyPayload = {
      input: params.input,
      agent_id: params.agentId,
      conversation_id: params.conversationId,
      connector_id: params.connectorId,
      capabilities: params.capabilities ?? getKibanaDefaultAgentCapabilities(),
      attachments: params.attachments,
      browser_api_tools: params.browserApiTools ?? [],
    };

    return defer(() => {
      return this.http.post(`${publicApiPath}/converse/async`, {
        signal: params.signal,
        asResponse: true,
        rawResponse: true,
        body: JSON.stringify(payload),
      });
    }).pipe(
      // @ts-expect-error SseEvent mixin issue
      httpResponseIntoObservable<ChatEvent>(),
      unwrapAgentBuilderErrors()
    );
  }
}
