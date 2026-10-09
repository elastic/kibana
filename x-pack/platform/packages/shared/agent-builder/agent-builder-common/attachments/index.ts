/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  Attachment,
  UnknownAttachment,
  TextAttachment,
  ScreenContextAttachment,
  EsqlAttachment,
  ConnectorAttachment,
} from './attachments';

export type {
  StaleAttachment,
  FreshAttachment,
  AttachmentStaleCheckResult,
  FreshAttachmentStalenessCheckError,
} from './stale_check';
export { isFreshAttachmentStalenessCheckError } from './stale_check';
export {
  AttachmentType,
  textAttachmentDataSchema,
  esqlAttachmentDataSchema,
  screenContextAttachmentDataSchema,
  connectorAttachmentDataSchema,
  imageAttachmentDataSchema,
  pdfAttachmentDataSchema,
  CONNECTOR_TAG_PREFIX,
  SUPPORTED_IMAGE_MIME_TYPES,
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
  CHAT_ATTACHMENT_PDFS_FILE_KIND,
  SUPPORTED_PDF_MIME_TYPE,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_ROUND,
  MAX_PDF_BYTES,
  MAX_PDF_TEXT_LENGTH,
  type TextAttachmentData,
  type ScreenContextAttachmentData,
  type TimeRange,
  screenContextTimeRangeSchema,
  type EsqlAttachmentData,
  type ConnectorAttachmentData,
  type ImageAttachmentData,
  type SupportedImageMimeType,
  type PdfAttachmentData,
} from './attachment_types';

export type {
  VersionedAttachment,
  VersionedAttachmentWithOrigin,
  AttachmentVersion,
  AttachmentVersionRef,
  AttachmentRefOperation,
  AttachmentRefActor,
  AttachmentDiff,
  AttachmentInput,
  AttachmentGroup,
  ConversationAttachment,
  UpdateOriginResponse,
} from './versioned_attachment';
export {
  ATTACHMENT_REF_OPERATION,
  ATTACHMENT_REF_ACTOR,
  attachmentVersionSchema,
  versionedAttachmentSchema,
  attachmentVersionRefSchema,
  attachmentRefOperationSchema,
  attachmentRefActorSchema,
  attachmentInputSchema,
  attachmentGroupSchema,
  attachmentDiffSchema,
  isAttachmentGroup,
  getLatestVersion,
  getVersion,
  createVersionId,
  parseVersionId,
  isAttachmentActive,
  getActiveAttachments,
  isVersionedAttachmentWithOrigin,
  isVersionedAttachmentOfType,
  hashContent,
  estimateTokens,
  getContentKey,
} from './versioned_attachment';
