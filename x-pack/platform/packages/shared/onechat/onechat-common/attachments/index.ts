/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  Attachment,
  UnknownAttachment,
  AttachmentInput,
  TextAttachment,
  ApplicationContextAttachment,
  EsqlAttachment,
  TimerangeAttachment,
} from './attachments';
export {
  AttachmentType,
  textAttachmentDataSchema,
  esqlAttachmentDataSchema,
  applicationContextAttachmentDataSchema,
  timeRangeAttachmentDataSchema,
  type TextAttachmentData,
  type ApplicationContextAttachmentData,
  type EsqlAttachmentData,
  type TimerangeAttachmentData,
} from './attachment_types';
