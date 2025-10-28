/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentType, AttachmentDataOf } from './attachment_types';

export interface AttachmentMixin<Type extends AttachmentType> {
  /** The id of the attachment */
  id: string;
  /** Type of the attachment */
  type: AttachmentType;
  /** data bound to the attachment */
  data: AttachmentDataOf<Type>;

  // TODO: hidden in the UI
  hidden?: boolean;
  // TODO: transient - only displayed for current round
  transient?: boolean;
}

// Attachments

export type TextAttachment = AttachmentMixin<AttachmentType.text>;

/**
 * Composite type representing all possible conversation attachments.
 */
export type Attachment = TextAttachment;

// AttachmentInput

export type AttachmentInput = Omit<Attachment, 'id'> & Partial<Pick<Attachment, 'id'>>;

export type UnvalidatedAttachment = Omit<AttachmentInput, 'data' | 'type'> & {
  type: string;
  data: unknown;
};
