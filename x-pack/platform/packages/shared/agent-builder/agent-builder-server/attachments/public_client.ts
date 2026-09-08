/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';

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
  create(args: {
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
  }): Promise<VersionedAttachment>;

  get(args: {
    conversationId: string;
    attachmentId: string;
  }): Promise<VersionedAttachment>;

  update(args: {
    conversationId: string;
    attachmentId: string;
    /** The new attachment data/content. */
    data?: unknown;
    /** Optional new description. */
    description?: string;
  }): Promise<VersionedAttachment>;

  delete(args: {
    conversationId: string;
    attachmentId: string;
    /** Permanently remove the attachment (only when unreferenced and no client_id). */
    permanent?: boolean;
  }): Promise<void>;

  list(args: {
    conversationId: string;
    /** Include soft-deleted attachments in the result. */
    includeDeleted?: boolean;
  }): Promise<ListAttachmentsResult>;
}
