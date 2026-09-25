/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, OperatorFunction } from 'rxjs';
import { defer, pipe } from 'rxjs';
import type { HttpResponse, HttpSetup } from '@kbn/core-http-browser';
import { buildPath } from '@kbn/core-http-browser';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { type PromptResponse } from '@kbn/agent-builder-common/agents';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { chatApiPath, internalApiPath } from '../../../common/constants';
import type {
  AbortExecutionResponse,
  ChatRequestBodyPayload,
  ChatTriggerMode,
} from '../../../common/http_api/chat';
import type { ConversationWithPermissions } from '../../../common/http_api/conversations';
import { unwrapAgentBuilderErrors } from '../utils/errors';
import type { EventsService } from '../events';
import { propagateEvents } from './propagate_events';
import { streamWithReattach } from './reattach_on_disconnect';

interface BaseConverseParams {
  signal?: AbortSignal;
  agentId?: string;
  connectorId?: string;
  conversationId: string;
  executionId: string;
  browserApiTools?: BrowserApiToolMetadata[];
  projectRouting?: string;
}

export type ChatParams = BaseConverseParams & {
  input: string;
  attachments?: AttachmentInput[];
};

export type ResumeRoundParams = BaseConverseParams & {
  prompts: Record<string, PromptResponse>;
};

/**
 * Wire payload for `converse()` with `conversation_id` narrowed to required. Every
 * Agent Builder UI caller passes a client-generated UUID before chat fires.
 */
type ConversePayload = ChatRequestBodyPayload & {
  conversation_id: string;
  execution_id: string;
};

const parseChatEvents = (): OperatorFunction<HttpResponse, ChatEvent> =>
  pipe(
    // @ts-expect-error SseEvent mixin issue
    httpResponseIntoObservable<ChatEvent>(),
    unwrapAgentBuilderErrors()
  );

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
      execution_id: params.executionId,
      connector_id: params.connectorId,
      attachments: params.attachments,
      browser_api_tools: params.browserApiTools ?? [],
      project_routing: params.projectRouting,
    });
  }

  /**
   * Resume a round that is awaiting a prompt response (e.g., confirmation).
   */
  resume(params: ResumeRoundParams): Observable<ChatEvent> {
    return this.converse(params.signal, {
      agent_id: params.agentId,
      conversation_id: params.conversationId,
      execution_id: params.executionId,
      connector_id: params.connectorId,
      prompts: params.prompts,
      browser_api_tools: params.browserApiTools ?? [],
      project_routing: params.projectRouting,
    });
  }

  /**
   * Append a user message to an existing conversation without running the agent.
   */
  sendUserMessage({
    conversationId,
    input,
    attachments,
    triggerMode,
  }: {
    conversationId: string;
    input: string;
    attachments?: AttachmentInput[];
    triggerMode: ChatTriggerMode;
  }): Promise<ConversationWithPermissions> {
    const payload: ChatRequestBodyPayload = {
      trigger_mode: triggerMode,
      conversation_id: conversationId,
      input,
      attachments,
    };
    return this.http.post<ConversationWithPermissions>(`${chatApiPath}/converse`, {
      body: JSON.stringify(payload),
    });
  }

  followExecution(executionId: string, signal?: AbortSignal): Observable<ChatEvent> {
    return defer(() => {
      return this.http.get(`${internalApiPath}/executions/${executionId}/follow`, {
        signal,
        asResponse: true,
        rawResponse: true,
      });
    }).pipe(parseChatEvents());
  }

  abort(executionId: string): Promise<AbortExecutionResponse> {
    return this.http.post<AbortExecutionResponse>(
      `${internalApiPath}/executions/${executionId}/abort`
    );
  }

  private converse(signal: AbortSignal | undefined, payload: ConversePayload) {
    return streamWithReattach({
      connect: () =>
        this.http.post(`${chatApiPath}/converse/async`, {
          signal,
          asResponse: true,
          rawResponse: true,
          body: JSON.stringify(payload),
        }),
      reattach: (offset) =>
        this.http.get(
          buildPath(`${internalApiPath}/executions/{executionId}/reattach`, {
            executionId: payload.execution_id,
          }),
          {
            signal,
            asResponse: true,
            rawResponse: true,
            query: { offset },
          }
        ),
      parse: parseChatEvents(),
      signal,
    }).pipe(
      propagateEvents({
        eventsService: this.events,
        conversationId: payload.conversation_id,
      })
    );
  }
}
