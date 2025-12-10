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
  VisualizationAttachment,
} from './attachments';
export {
  AttachmentType,
  textAttachmentDataSchema,
  esqlAttachmentDataSchema,
  screenContextAttachmentDataSchema,
  visualizationAttachmentDataSchema,
  type TextAttachmentData,
  type ScreenContextAttachmentData,
  type EsqlAttachmentData,
  type VisualizationAttachmentData,
} from './attachment_types';

// Versioned attachment types
export type {
  AttachmentVersion,
  VersionedAttachment,
  AttachmentVersionRef,
  AttachmentDiff,
  VersionedAttachmentInput,
} from './versioned_attachment';
export {
  attachmentVersionRefSchema,
  attachmentVersionSchema,
  versionedAttachmentSchema,
  versionedAttachmentInputSchema,
  getLatestVersion,
  getVersion,
  createVersionId,
  parseVersionId,
  isAttachmentActive,
  getActiveAttachments,
  hashContent,
  estimateTokens,
} from './versioned_attachment';
