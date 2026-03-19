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
import {
  getKibanaDefaultAgentCapabilities,
  type PromptResponse,
} from '@kbn/agent-builder-common/agents';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { publicApiPath } from '../../../common/constants';
import type { ChatRequestBodyPayload } from '../../../common/http_api/chat';
import { unwrapAgentBuilderErrors } from '../utils/errors';
import type { EventsService } from '../events';
import { propagateEvents } from './propagate_events';

interface BaseConverseParams {
  signal?: AbortSignal;
  agentId?: string;
  connectorId?: string;
  conversationId?: string;
  browserApiTools?: BrowserApiToolMetadata[];
  capabilities?: AgentCapabilities;
}

export type ChatParams = BaseConverseParams & {
  input: string;
  attachments?: AttachmentInput[];
};

export type ResumeRoundParams = BaseConverseParams & {
  conversationId: string;
  prompts: Record<string, PromptResponse>;
};

export type RegenerateParams = BaseConverseParams & {
  conversationId: string;
};

export class ChatService {
  private readonly http: HttpSetup;
  private readonly events: EventsService;

  constructor({ http, events }: { http: HttpSetup; events: EventsService }) {
    this.http = http;
    this.events = events;
  }

  chat(params: ChatParams): Observable<ChatEvent> {
    return this.converse(params.signal, {
      input: params.input,
      agent_id: params.agentId,
      conversation_id: params.conversationId,
      connector_id: params.connectorId,
      capabilities: params.capabilities ?? getKibanaDefaultAgentCapabilities(),
      attachments: params.attachments,
      browser_api_tools: params.browserApiTools ?? [],
    });
  }

  /**
   * Resume a round that is awaiting a prompt response (e.g., confirmation).
   */
  resume(params: ResumeRoundParams): Observable<ChatEvent> {
    return this.converse(params.signal, {
      agent_id: params.agentId,
      conversation_id: params.conversationId,
      connector_id: params.connectorId,
      capabilities: params.capabilities ?? getKibanaDefaultAgentCapabilities(),
      prompts: params.prompts,
      browser_api_tools: params.browserApiTools ?? [],
    });
  }

  regenerate(params: RegenerateParams): Observable<ChatEvent> {
    return this.converse(params.signal, {
      agent_id: params.agentId,
      conversation_id: params.conversationId,
      connector_id: params.connectorId,
      capabilities: params.capabilities ?? getKibanaDefaultAgentCapabilities(),
      browser_api_tools: params.browserApiTools ?? [],
      action: 'regenerate',
    });
  }

  private converse(signal: AbortSignal | undefined, payload: ChatRequestBodyPayload) {
    return defer(() => {
      return this.http.post(`${publicApiPath}/converse/async`, {
        signal,
        asResponse: true,
        rawResponse: true,
        body: JSON.stringify(payload),
      });
    }).pipe(
      // @ts-expect-error SseEvent mixin issue
      httpResponseIntoObservable<ChatEvent>(),
      unwrapAgentBuilderErrors(),
      propagateEvents({ eventsService: this.events })
    );
  }
}
