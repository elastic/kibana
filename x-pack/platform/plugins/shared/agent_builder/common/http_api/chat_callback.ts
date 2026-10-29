/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationOrigin,
  ConversationRoundAuthor,
  ConversationOriginType,
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
  conversation_id: string;
}

export type {
  ChatCallbackEventResponse,
  ChatCallbackFailureResponse,
  ChatCallbackResponse,
} from '@kbn/agent-builder-common';
