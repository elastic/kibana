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
  MetadataFieldValue,
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
   * Applies the named template to the conversation, seeding default metadata
   * values and bumping template_version. Re-applying the same template migrates
   * to the latest version; switching templates is rejected.
   * `version` is reserved for future version-pinned applies and is currently ignored.
   */
  applyTemplate(conversationId: string, templateId: string, version?: number): Promise<void>;

  /**
   * Merges `metadata` into the conversation's stored metadata object. The
   * conversation must already have a template applied; unknown keys are rejected.
   */
  patchMetadata(conversationId: string, metadata: Record<string, unknown>): Promise<void>;

  /** Fetches multiple conversations by id in a single request. */
  bulkGet(ids: string[]): Promise<ConversationWithPermissions[]>;
}
