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
/**
 * A rasterized chart an `image` block in `blocks` references by placeholder ref.
 *
 * Kibana renders the PNG but cannot upload it — only the host holds the surface
 * credential — so the bytes travel here and the host rewrites the ref to the file id it
 * gets back. A host that cannot upload must drop `blocks` as well, since Slack fails the
 * whole message over one unresolved ref.
 */
export interface SurfaceProjectionAssetPayload {
  ref: string;
  /** Base64-encoded PNG. */
  data: string;
  alt_text: string;
}

export interface SurfaceProjectionPayload {
  /** Surface-ready text, render tags resolved. Carries the whole answer, so a host that rejects `blocks` still posts it in full. */
  text: string;
  /** Surface-native rich payload — Slack Block Kit. Hosts that cannot use it fall back to `text`. */
  blocks?: unknown[];
  /** Chart images `blocks` references by ref; the host uploads these before posting. */
  assets?: SurfaceProjectionAssetPayload[];
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
