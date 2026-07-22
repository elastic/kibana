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
  ExecutionStatus,
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

export const isChatCallbackRequestBodyPayload = (
  payload: ChatRequestBodyPayload | ChatCallbackRequestBodyPayload
): payload is ChatCallbackRequestBodyPayload => {
  return 'callback' in payload;
};

export interface ChatCallbackAcceptedResponse {
  execution_id: string;
  status: ExecutionStatus.scheduled;
}

export interface ChatCallbackEventPayload {
  execution_id: string;
  status: ExecutionStatus.running;
  event: ChatEvent;
}

export interface ChatCallbackFailurePayload {
  execution_id: string;
  status: ExecutionStatus.failed | ExecutionStatus.aborted;
  error?: SerializedExecutionError;
}

export type ChatCallbackOutboundPayload = ChatCallbackEventPayload | ChatCallbackFailurePayload;
