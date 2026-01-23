/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { AgentCapabilities, ChatEvent, ConverseInput } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';

export interface ChatService {
  converse(params: ChatConverseParams): Observable<ChatEvent>;
}

/**
 * Parameters for {@link ChatService.converse}
 */
export interface ChatConverseParams {
  /**
   * Id of the conversational agent to converse with.
   * If empty, will use the default agent id.
   */
  agentId?: string;
  /**
   * Id of the genAI connector to use.
   * If empty, will use the default connector.
   */
  connectorId?: string;
  /**
   * Id of the conversation to continue.
   * If empty, will create a new conversation instead.
   */
  conversationId?: string;
  /**
   * Set of capabilities to use for this round.
   * Defaults to all capabilities being disabled.
   */
  capabilities?: AgentCapabilities;
  /**
   * Whether to use structured output mode. When true, the agent will return structured data instead of plain text.
   */
  structuredOutput?: boolean;
  /**
   * Optional JSON schema for structured output. Only used when structuredOutput is true.
   * If not provided, uses a default schema.
   */
  outputSchema?: Record<string, unknown>;
  /**
   * When false, the conversation will not be persisted (no conversation_created/updated events).
   * Defaults to true.
   */
  storeConversation?: boolean;
  /**
   * Create conversation with specified ID if not found.
   * Defaults to false. Has no effect when conversationId is not provided.
   */
  autoCreateConversationWithId?: boolean;
  /**
   * Optional abort signal to handle cancellation.
   * Canceled rounds will not be persisted.
   */
  abortSignal?: AbortSignal;
  /**
   * Next user input to start the round.
   */
  nextInput: ConverseInput;
  /**
   * Request bound to this call.
   */
  request: KibanaRequest;
  /**
   * Browser API tools to make available to the agent.
   * These tools will be registered as LLM tools with browser.* namespace.
   */
  browserApiTools?: BrowserApiToolMetadata[];
}
