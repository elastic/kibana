/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common';

/**
 * Controls who may perform the attachment write. Mirrors the same option on `patchMetadata`.
 * - `'owner'` (default): only the conversation owner may write.
 * - `'converse'`: any user with converse access (collaborators on private conversations,
 *   any authenticated user on public ones) may write.
 */
export type AttachmentWriteAccess = 'owner' | 'converse';

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
  /** When true, the UI renders the attachment inline when the conversation is opened. Defaults to false. */
  render_inline?: boolean;
  /**
   * Who may perform this write. Defaults to `'owner'`.
   * Pass `'converse'` to let collaborators (or any user on public conversations) write.
   */
  access?: AttachmentWriteAccess;
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
  /** When true, the UI renders the attachment inline when the conversation is opened. Defaults to false. */
  render_inline?: boolean;
  /**
   * Who may perform this write. Defaults to `'owner'`.
   * Pass `'converse'` to let collaborators (or any user on public conversations) write.
   */
  access?: AttachmentWriteAccess;
}

/**
 * Arguments for {@link AttachmentPublicClient.delete}.
 */
export interface DeleteAttachmentArgs {
  conversationId: string;
  attachmentId: string;
  /** Permanently remove the attachment (only when unreferenced and no client_id). */
  permanent?: boolean;
  /**
   * Who may perform this write. Defaults to `'owner'`.
   * Pass `'converse'` to let collaborators (or any user on public conversations) write.
   */
  access?: AttachmentWriteAccess;
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
 * Per-attachment input for {@link BulkCreateAttachmentsArgs}.
 * Same as the individual fields from `CreateAttachmentArgs`, without `conversationId`,
 * `access`, or `render_inline` (those are specified once at the bulk level).
 */
export type BulkCreateAttachmentInput = Omit<
  CreateAttachmentArgs,
  'conversationId' | 'access' | 'render_inline'
>;

/**
 * Error reported when one attachment in a `bulkCreate` call fails.
 */
export interface BulkCreateAttachmentError {
  /** The custom id supplied by the caller, or undefined when the id was server-generated. */
  id?: string;
  type: string;
  message: string;
}

/**
 * Result of {@link AttachmentPublicClient.bulkCreate}.
 */
export interface BulkCreateAttachmentsResult {
  created: VersionedAttachment[];
  errors: BulkCreateAttachmentError[];
}

/**
 * Arguments for {@link AttachmentPublicClient.bulkCreate}.
 */
export interface BulkCreateAttachmentsArgs {
  conversationId: string;
  attachments: BulkCreateAttachmentInput[];
  /**
   * Who may perform this write. Defaults to `'owner'`.
   * Pass `'converse'` to let collaborators (or any user on public conversations) write.
   */
  access?: AttachmentWriteAccess;
  /**
   * When true, the UI renders every added attachment inline when the conversation is opened.
   * Applies to the whole batch. Defaults to false.
   */
  render_inline?: boolean;
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
  /**
   * Creates multiple attachments in a single write. Per-attachment failures are collected in
   * `errors` rather than thrown, so the successfully created attachments are always persisted.
   * Ids that already exist on the conversation are counted as errors.
   */
  bulkCreate(args: BulkCreateAttachmentsArgs): Promise<BulkCreateAttachmentsResult>;
}
