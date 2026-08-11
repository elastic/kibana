/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValuesType } from 'utility-types';
import type {
  ATTACHMENT_TYPE,
  ATTACHMENT_ID,
  ATTACHMENT_UUID,
  STREAM_NAMES,
} from './storage_settings';

export const ATTACHMENT_TYPES = ['dashboard', 'rule', 'slo'] as const;

export type AttachmentType = ValuesType<typeof ATTACHMENT_TYPES>;

export interface AttachmentLink {
  id: string;
  type: AttachmentType;
}

export interface AttachmentData extends AttachmentLink {
  /**
   * The display title of the attachment.
   */
  title: string;
  /**
   * List of tag IDs associated with the attachment.
   */
  tags: string[];
  /**
   * The identifier used for navigation to the attachment's detail page.
   *
   * For most attachment types, this matches the `id` field. However, for SLOs,
   * `id` refers to the saved object ID while `redirectId` contains the SLO's
   * own ID, which is required for proper navigation.
   */
  redirectId: string;
  /**
   * Optional description of the attachment.
   */
  description?: string;
  /**
   * The date and time the attachment was created.
   */
  createdAt?: string;
  /**
   * The date and time the attachment was last updated.
   */
  updatedAt?: string;
}

export interface Attachment extends AttachmentData {
  /**
   * The names of streams this attachment is linked to.
   */
  streamNames: string[];
}

export interface AttachmentDocument {
  [ATTACHMENT_TYPE]: AttachmentType;
  [ATTACHMENT_ID]: string;
  [ATTACHMENT_UUID]: string;
  [STREAM_NAMES]: string[];
}

interface AttachmentBulkIndexOperation {
  index: { attachment: AttachmentLink };
}
interface AttachmentBulkDeleteOperation {
  delete: { attachment: AttachmentLink };
}

export type AttachmentBulkOperation = AttachmentBulkIndexOperation | AttachmentBulkDeleteOperation;

export interface DashboardSOAttributes {
  title: string;
  description?: string;
}

export interface SloSOAttributes {
  name: string;
  id: string;
  description?: string;
}
