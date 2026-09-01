/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentType, AttachmentDataOf } from './attachment_types';

/**
 * Represents a conversation attachment, as returned by the conversation API.
 */
export interface Attachment<
  Type extends string = string,
  DataType = Type extends AttachmentType ? AttachmentDataOf<Type> : Record<string, unknown>
> {
  /** Unique identifier for the attachment */
  id: string;
  /** Type of the attachment */
  type: Type;
  /** data bound to the attachment */
  data: DataType;
  /** Human-readable description of the attachment */
  description?: string;
  /** should the attachment be hidden from the user - e.g. for screen context */
  hidden?: boolean;
  /**
   * Origin/reference info for attachments created from external sources.
   * For saved-object-backed types this is the saved object ID.
   * Undefined for by-value attachments.
   */
  origin?: string;
  /**
   * Version metadata for this attachment snapshot.
   * Undefined when version metadata is unavailable.
   */
  versionData?: {
    /** The version number of this snapshot */
    version: number;
    /** Total number of versions for this attachment */
    versionCount: number;
    /** ISO timestamp of when this version was created */
    createdAt: string;
    /**
     * ISO timestamp of when this attachment's content was last synced with its origin.
     * Set when `updateOrigin` is called. Undefined when the attachment has never been saved to an origin.
     */
    originSyncedAt?: string;
    /**
     * Data from the immediately preceding version, if one exists.
     * Used by attachment renderers to compute diffs between the current and previous version.
     */
    previousVersionData?: DataType;
  };
  /**
   * Stable identifier for the logical group this attachment belongs to.
   * Attachments sharing the same groupId were submitted together as a single
   * logical entity (e.g. multiple alert batches from one bulk-add action).
   * Undefined for standalone attachments.
   */
  groupId?: string;
}

/**
 * Attachment type that accepts any attachment.
 */
export type UnknownAttachment = Attachment<string, unknown>;

// Strongly typed sub-types for known attachment types

export type TextAttachment = Attachment<AttachmentType.text>;
export type ScreenContextAttachment = Attachment<AttachmentType.screenContext>;
export type EsqlAttachment = Attachment<AttachmentType.esql>;
export type ConnectorAttachment = Attachment<AttachmentType.connector>;
