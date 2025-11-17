/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  Attachment,
  AttachmentInput,
  TextAttachment,
  ScreenContextAttachment,
  EsqlAttachment,
  AlertAttachment,
} from './attachments';
export {
  AttachmentType,
  textAttachmentDataSchema,
  esqlAttachmentDataSchema,
  screenContextAttachmentDataSchema,
  alertAttachmentDataSchema,
  type TextAttachmentData,
  type ScreenContextAttachmentData,
  type EsqlAttachmentData,
  type AlertAttachmentData,
} from './attachment_types';
