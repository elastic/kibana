/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';

/**
 * Arguments for {@link AttachmentPublicClient.create}.
 */
export interface CreateAttachmentArgs {
  conversationId: string;
  /** Optional custom ID for the attachment. */
  id?: string;
  /** The type of the attachment (e.g. 'text', 'esql', 'visualization'). */
  type: string;
  /** The attachment data/content. Required unless `origin` is provided. */
  data?: unknown;
  /** Origin string for by-reference attachments; content is resolved at creation time when `data` is omitted. */
  origin?: string;
  /** Human-readable description of the attachment. */
  description?: string;
  /** Whether the attachment should be hidden from the user. */
  hidden?: boolean;
}

/**
 * Arguments for {@link AttachmentPublicClient.get}.
 */
export interface GetAttachmentArgs {
  conversationId: string;
  attachmentId: string;
}

/**
 * Arguments for {@link AttachmentPublicClient.update}.
 */
export interface UpdateAttachmentArgs {
  conversationId: string;
  attachmentId: string;
  /** The new attachment data/content. */
  data?: unknown;
  /** Optional new description. */
  description?: string;
}

/**
 * Arguments for {@link AttachmentPublicClient.delete}.
 */
export interface DeleteAttachmentArgs {
  conversationId: string;
  attachmentId: string;
  /** Permanently remove the attachment (only when unreferenced and no client_id). */
  permanent?: boolean;
}

/**
 * Arguments for {@link AttachmentPublicClient.list}.
 */
export interface ListAttachmentsArgs {
  conversationId: string;
  /** Include soft-deleted attachments in the result. */
  includeDeleted?: boolean;
}

/**
 * Result of a `list` call on the public client.
 */
export interface ListAttachmentsResult {
  results: VersionedAttachment[];
  total_token_estimate: number;
}

/**
 * A per-request client exposing the AgentBuilder attachment CRUD operations
 * without going through HTTP.
 *
 * Obtain one via `AgentBuilderPluginStart.attachments.getScopedClient({ request })`.
 *
 * Errors:
 *  - `AttachmentNotFoundError` when the target attachment (or conversation) is missing.
 *  - `AttachmentConflictError` on duplicate ids, permanent-delete guards, etc.
 *  - `AttachmentValidationError` when type validation fails or the target attachment is in an invalid state.
 */
export interface AttachmentPublicClient {
  create(args: CreateAttachmentArgs): Promise<VersionedAttachment>;
  get(args: GetAttachmentArgs): Promise<VersionedAttachment>;
  update(args: UpdateAttachmentArgs): Promise<VersionedAttachment>;
  delete(args: DeleteAttachmentArgs): Promise<void>;
  list(args: ListAttachmentsArgs): Promise<ListAttachmentsResult>;
}
