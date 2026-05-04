/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AttachmentRequest, AttachmentRequestV2 } from '../../types/api';
import type {
  EventAttachmentPayload,
  ExternalReferenceAttachmentPayload,
  PersistableStateAttachmentPayload,
  UnifiedAttachmentPayload,
  UserCommentAttachmentPayload,
} from '../../types/domain';
import { LEGACY_ATTACHMENT_TYPES } from '../../constants/attachments';
import { AttachmentType } from '../../types/domain';

/**
 * A type narrowing function for external reference attachments.
 */
export const isCommentRequestTypeExternalReference = (
  context: AttachmentRequestV2
): context is ExternalReferenceAttachmentPayload => {
  return context.type === AttachmentType.externalReference;
};

/**
 * A type narrowing function for persistable state attachments.
 */
export const isCommentRequestTypePersistableState = (
  context: Partial<AttachmentRequest> | UnifiedAttachmentPayload
): context is PersistableStateAttachmentPayload => {
  return context.type === AttachmentType.persistableState;
};

export const isLegacyAttachmentRequest = (
  context: AttachmentRequestV2
): context is AttachmentRequest => {
  return Boolean(
    (context.type as string) && LEGACY_ATTACHMENT_TYPES.has(context.type as AttachmentType)
  );
};

export const isLegacyCommentAttachment = (
  attachment: AttachmentRequestV2
): attachment is UserCommentAttachmentPayload => attachment.type === AttachmentType.user;

export const isLegacyEventAttachment = (
  attachment: AttachmentRequestV2
): attachment is EventAttachmentPayload => attachment.type === AttachmentType.event;
