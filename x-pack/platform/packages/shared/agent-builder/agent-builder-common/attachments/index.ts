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
  ScreenContextAttachment,
  EsqlAttachment,
} from './attachments';
export {
  AttachmentType,
  textAttachmentDataSchema,
  esqlAttachmentDataSchema,
  screenContextAttachmentDataSchema,
  type TextAttachmentData,
  type ScreenContextAttachmentData,
  type EsqlAttachmentData,
} from './attachment_types';

export type {
  VersionedAttachment,
  AttachmentVersion,
  AttachmentVersionRef,
  AttachmentDiff,
  VersionedAttachmentInput,
} from './versioned_attachment';
export {
  attachmentVersionSchema,
  versionedAttachmentSchema,
  attachmentVersionRefSchema,
  versionedAttachmentInputSchema,
  attachmentDiffSchema,
  getLatestVersion,
  getVersion,
  createVersionId,
  parseVersionId,
  isAttachmentActive,
  getActiveAttachments,
  hashContent,
  estimateTokens,
} from './versioned_attachment';
