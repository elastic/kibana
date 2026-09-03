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

/**
 * One surface's ready-to-post rendering of an event's reply, so a host with no browser
 * does not have to interpret Kibana's render tags itself.
 *
 * `message_key`, which an external host needs to tell a new message from an update, lands
 * with per-message projection; today a turn carries at most one projection.
 */
export interface SurfaceProjectionPayload {
  /** Surface-ready text, render tags resolved. Carries the whole answer, so a host that rejects `blocks` still posts it in full. */
  text: string;
  /** Surface-native rich payload — Slack Block Kit. Hosts that cannot use it fall back to `text`. */
  blocks?: unknown[];
  /** Last projection for this turn; a host appends its own chrome to it. */
  final?: boolean;
}

export interface ChatCallbackEventResponse {
  execution_id: string;
  event: ChatEvent;
  idempotency_key?: string;
  /**
   * Per-surface projections of this event, keyed by origin type (`projection.slack`).
   *
   * Additive by design: a host that does not know the field ignores it and keeps reading
   * `event`, which still carries the unprojected reply for the Kibana transcript.
   */
  projection?: Partial<Record<ConversationOriginType, SurfaceProjectionPayload>>;
}

export interface ChatCallbackFailureResponse {
  execution_id: string;
  error: SerializedExecutionError;
  idempotency_key: string;
}

export type ChatCallbackResponse = ChatCallbackEventResponse | ChatCallbackFailureResponse;
