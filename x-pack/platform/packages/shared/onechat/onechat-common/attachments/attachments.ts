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
}

// Strongly typed sub-types for known attachment types

export type TextAttachment = Attachment<AttachmentType.text>;
export type ScreenContextAttachment = Attachment<AttachmentType.screenContext>;

/**
 * Input version of an attachment, where the id is optional
 */
export type AttachmentInput = Omit<Attachment, 'id'> & Partial<Pick<Attachment, 'id'>>;
