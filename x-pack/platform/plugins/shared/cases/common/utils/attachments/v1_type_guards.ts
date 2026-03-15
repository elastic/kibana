/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AttachmentRequest, AttachmentRequestV2 } from '../../types/api';
import type {
  ExternalReferenceAttachmentPayload,
  PersistableStateAttachmentPayload,
  UnifiedAttachmentPayload,
  UserCommentAttachmentPayload,
} from '../../types/domain';
import {
  LEGACY_EXTERNAL_REFERENCE_ATTACHMENT_TYPE,
  LEGACY_PERSISTABLE_STATE_ATTACHMENT_TYPE,
  LEGACY_COMMENT_ATTACHMENT_TYPE,
  LEGACY_ATTACHMENT_TYPES,
} from '../../constants/attachments';

/**
 * A type narrowing function for external reference attachments.
 */
export const isCommentRequestTypeExternalReference = (
  context: AttachmentRequestV2
): context is ExternalReferenceAttachmentPayload => {
  return context.type === LEGACY_EXTERNAL_REFERENCE_ATTACHMENT_TYPE;
};

/**
 * A type narrowing function for persistable state attachments.
 */
export const isCommentRequestTypePersistableState = (
  context: Partial<AttachmentRequest> | UnifiedAttachmentPayload
): context is PersistableStateAttachmentPayload => {
  return context.type === LEGACY_PERSISTABLE_STATE_ATTACHMENT_TYPE;
};

export const isLegacyAttachmentRequest = (
  context: AttachmentRequestV2
): context is AttachmentRequest => {
  return Boolean((context.type as string) && LEGACY_ATTACHMENT_TYPES.has(context.type));
};

export const isLegacyCommentAttachment = (
  attachment: AttachmentRequestV2
): attachment is UserCommentAttachmentPayload => attachment.type === LEGACY_COMMENT_ATTACHMENT_TYPE;
