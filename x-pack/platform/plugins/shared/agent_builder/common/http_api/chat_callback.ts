/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChatEvent,
  ConversationOrigin,
  ConversationRoundAuthor,
  ConversationOriginType,
  SerializedExecutionError,
} from '@kbn/agent-builder-common';
import type { ChatRequestBodyPayload } from './chat';

export interface ChatCallbackRequestBodyPayload extends ChatRequestBodyPayload {
  execution_idempotency_key: string;
  origin?: ConversationOrigin & {
    type: ConversationOriginType;
    author?: ConversationRoundAuthor;
  };
  callback: {
    url: string;
  };
}

export interface ChatCallbackAcceptedResponse {
  execution_id: string;
}

export interface ChatCallbackEventResponse {
  execution_id: string;
  event: ChatEvent;
  idempotency_key?: string;
}

export interface ChatCallbackFailureResponse {
  execution_id: string;
  error: SerializedExecutionError;
  idempotency_key: string;
}

export type ChatCallbackResponse = ChatCallbackEventResponse | ChatCallbackFailureResponse;
