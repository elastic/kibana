/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TextArtifact } from './artifacts';
import { ArtifactType } from './artifacts';

// TODO: fix all of this - we need strong typed for internal + loose typed for external...

export enum AttachmentType {
  screenContext = 'screen_context',
  text = ArtifactType.text,
  dashboard = ArtifactType.dashboard,
}

interface AttachmentDataMap {
  [AttachmentType.text]: TextArtifact;
  [AttachmentType.dashboard]: {};
  [AttachmentType.screenContext]: {};
}

type AttachmentDataOf<Type extends AttachmentType> = AttachmentDataMap[Type];

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

export type DashboardAttachment = AttachmentMixin<AttachmentType.dashboard>;

/**
 * Composite type representing all possible conversation attachments.
 */
export type Attachment = TextAttachment | DashboardAttachment;

// AttachmentInput

export type AttachmentInput = Omit<Attachment, 'id'> & Partial<Pick<Attachment, 'id'>>;

export type UnvalidatedAttachment = Omit<AttachmentInput, 'data' | 'type'> & {
  type: string;
  data: unknown;
};
