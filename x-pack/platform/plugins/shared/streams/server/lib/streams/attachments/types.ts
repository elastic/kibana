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

export const ATTACHMENT_TYPES = ['dashboard', 'rule'] as const;

export type AttachmentType = ValuesType<typeof ATTACHMENT_TYPES>;

export interface AttachmentLink {
  id: string;
  type: AttachmentType;
}

export interface Attachment extends AttachmentLink {
  title: string;
  tags: string[];
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
