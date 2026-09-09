/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationAccessControlInput,
  ConversationListOptions,
  ConversationWithPermissions,
  ConversationListResult,
} from '@kbn/agent-builder-common';

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
}
