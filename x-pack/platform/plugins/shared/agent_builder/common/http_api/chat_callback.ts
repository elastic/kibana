/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationSource,
  ExecutionStatus,
  SerializedExecutionError,
} from '@kbn/agent-builder-common';
import type { ChatRequestBodyPayload, ChatResponse } from './chat';

export interface ChatCallbackRequestBodyPayload extends ChatRequestBodyPayload {
  source?: ConversationSource;
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

export interface ChatCallbackSuccessPayload {
  execution_id: string;
  status: ExecutionStatus.completed;
  response: ChatResponse;
}

export interface ChatCallbackFailurePayload {
  execution_id: string;
  status: ExecutionStatus.failed | ExecutionStatus.aborted;
  error?: SerializedExecutionError;
}

export type CallbackPayload = ChatCallbackSuccessPayload | ChatCallbackFailurePayload;
