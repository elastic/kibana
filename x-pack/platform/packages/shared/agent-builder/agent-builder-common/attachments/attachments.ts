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
  /** should the attachment be hidden from the user - e.g. for screen context */
  hidden?: boolean;
  /**
   * Origin/reference info for attachments created from external sources.
   * For saved-object-backed types this is the saved object ID.
   * Undefined for by-value attachments.
   */
  origin?: string;
  /**
   * Human-readable description of the attachment. Displayed in the chat as
   * "Attachment added: {description}" in the user's input round. This field is
   * carried through from AttachmentInput so that the optimistic render during
   * streaming can show the label before the server persists the VersionedAttachment.
   */
  description?: string;
  /** The version number of this attachment snapshot. Undefined when version metadata is unavailable. */
  version?: number;
  /** Total number of versions for this attachment. Undefined when version metadata is unavailable. */
  versionCount?: number;
}

/**
 * Attachment type that accepts any attachment.
 */
export type UnknownAttachment = Attachment<string, unknown>;

// Strongly typed sub-types for known attachment types

export type TextAttachment = Attachment<AttachmentType.text>;
export type ScreenContextAttachment = Attachment<AttachmentType.screenContext>;
export type EsqlAttachment = Attachment<AttachmentType.esql>;
export type VisualizationAttachment = Attachment<AttachmentType.visualization>;
export type ConnectorAttachment = Attachment<AttachmentType.connector>;
