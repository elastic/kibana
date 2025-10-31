/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { AgentCapabilities, ChatEvent, RawRoundInput } from '@kbn/onechat-common';
import type { KibanaRequest } from '@kbn/core-http-server';

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
  nextInput: RawRoundInput;
  /**
   * Request bound to this call.
   */
  request: KibanaRequest;
}
