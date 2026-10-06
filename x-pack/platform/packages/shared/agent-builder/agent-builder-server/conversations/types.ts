/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationAccessControlInput,
  ConversationAccessControlEntryInput,
  ConversationEvent,
  Conversation,
  ConversationListOptions,
  ConversationSearchOptions,
  ConversationWithPermissions,
  ConversationWithoutRoundsWithPermissions,
  ConversationListResult,
  MetadataFieldValue,
  ConversationAddEventInput,
} from '@kbn/agent-builder-common';

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
 * Input for updating a conversation's title. Metadata writes must go through
 * patchMetadata so the update is validated against the conversation's template.
 */
export interface ConversationUpdatePublicRequest {
  id: string;
  /** Capped at CONVERSATION_TITLE_MAX_LENGTH server-side. */
  title: string;
}

/**
 * A conversation client exposing get, bulk get, list, search, create, patchMetadata, and update operations
 */
export interface ConversationPublicClient {
  /**
   * Retrieve a single conversation by its ID, including all rounds.
   */
  get(conversationId: string): Promise<ConversationWithPermissions>;
  /**
   * Retrieve several conversations by ID in one request, without their rounds.
   */
  bulkGet(ids: string[]): Promise<Map<string, ConversationWithoutRoundsWithPermissions>>;
  /**
   * List conversations for the current user, optionally filtered by agent ID.
   */
  list(options?: ConversationListOptions): Promise<ConversationListResult>;
  /**
   * Search the conversations readable by the current user, by free-text title query, by KQL
   * filter, or both.
   */
  search(options: ConversationSearchOptions): Promise<ConversationListResult>;
  /**
   * Create a new empty conversation (without triggering an execution).
   */
  create(request: ConversationCreatePublicRequest): Promise<ConversationWithPermissions>;
  /**
   * Adds entries to a private conversation's ACL without removing existing entries or
   * changing the access mode. A no-op for public conversations; never removes entries.
   * Existing entries are left unchanged — even if the requested role differs. Role changes
   * go through `updateAccessControl` (owner-only). Safe to call with `access: 'converse'`
   * so collaborators (e.g. existing assignees) can add new members.
   */
  addAccessControlEntries(
    conversationId: string,
    entries: ConversationAccessControlEntryInput[],
    options?: { access?: 'owner' | 'converse' }
  ): Promise<Conversation>;
  /**
   * Removes principals from a private conversation's ACL. A no-op for public conversations
   * or when none of the principals are present. Never changes the access mode or the owner.
   * Safe to call with `access: 'converse'` so assignees can revoke access when un-assigning.
   */
  removeAccessControlEntries(
    conversationId: string,
    principals: Array<Pick<ConversationAccessControlEntryInput, 'type' | 'id'>>,
    options?: { access?: 'owner' | 'converse' }
  ): Promise<Conversation>;
  /**
   * Validate updates against the conversation's template and merge them into its metadata.
   * Defaults to owner-only access. Pass `{ access: 'converse' }` to allow collaborators or
   * any authenticated user (for public conversations) to write metadata.
   * The conversation must have a template applied.
   */
  patchMetadata(
    conversationId: string,
    updates: Record<string, MetadataFieldValue>,
    options?: { access?: 'owner' | 'converse' }
  ): Promise<{ conversation: Conversation; changedFields: string[] }>;
  /**
   * Update the conversation's title. Requires the caller to be the conversation owner.
   * Metadata writes must go through patchMetadata so they are validated against the template.
   */
  update(request: ConversationUpdatePublicRequest): Promise<Conversation>;
  /**
   * Append custom events to a conversation timeline. Requires converse access.
   * Only custom event types are accepted; built-in timeline event types are rejected.
   */
  addEvents(request: ConversationAddEventsRequest): Promise<ConversationEvent[]>;
}
