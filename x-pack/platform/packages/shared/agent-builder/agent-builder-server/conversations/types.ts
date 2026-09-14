/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationAccessControlInput,
  ConversationEvent,
  ConversationListOptions,
  ConversationWithPermissions,
  ConversationListResult,
  MetadataFieldValue,
} from '@kbn/agent-builder-common';

/** Input event for adding to a conversation. Server assigns id, created_at, and actor. */
export interface ConversationAddEventInput {
  type: string;
  data: Record<string, unknown>;
}

/** Request for adding events to a conversation. */
export interface ConversationAddEventsRequest {
  conversationId: string;
  events: ConversationAddEventInput[];
}

/**
 * Input for pre-creating an empty conversation without starting an execution.
 */
export interface ConversationCreatePublicRequest {
  /** The agent to associate with the conversation. Defaults to the default Elastic AI agent. */
  agentId?: string;
  /** Client-supplied UUID. Server-generated if omitted. */
  id?: string;
  /** Defaults to "New conversation". */
  title?: string;
  /** Defaults to `{ access_mode: 'private', entries: [] }`. */
  accessControl?: ConversationAccessControlInput;
  /**
   * Optional conversation template to apply.
   */
  templateId?: string;
  /**
   * Initial metadata values. Requires `templateId`.
   */
  metadata?: Record<string, MetadataFieldValue>;
}

/**
 * A conversation client exposing get, list, and create operations.
 */
export interface ConversationPublicClient {
  /**
   * Retrieve a single conversation by its ID, including all rounds.
   */
  get(conversationId: string): Promise<ConversationWithPermissions>;
  /**
   * List conversations for the current user, optionally filtered by agent ID.
   */
  list(options?: ConversationListOptions): Promise<ConversationListResult>;
  /**
   * Create a new empty conversation (without triggering an execution).
   */
  create(request: ConversationCreatePublicRequest): Promise<ConversationWithPermissions>;
  /**
   * Append custom events to a conversation timeline. Requires converse access.
   * Only custom (non-internal) event types are accepted.
   */
  addEvents(request: ConversationAddEventsRequest): Promise<ConversationEvent[]>;
}
