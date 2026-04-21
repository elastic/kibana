/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AttachmentRequestV2 } from '../../types/api';
import { AttachmentType } from '../../types/domain';
import type {
  UnifiedAttachmentPayload,
  UnifiedReferenceAttachmentPayload,
  UnifiedValueAttachmentPayload,
} from '../../types/domain';
import {
  COMMENT_ATTACHMENT_TYPE,
  SECURITY_EVENT_ATTACHMENT_TYPE,
} from '../../constants/attachments';

const isReferenceAttachmentId = (value: unknown): value is string | string[] => {
  if (typeof value === 'string') {
    return true;
  }
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
};

/**
 * A type narrowing function for  reference-based unified attachment.
 */
export const isUnifiedReferenceAttachmentRequest = (
  context: AttachmentRequestV2
): context is UnifiedReferenceAttachmentPayload => {
  return 'attachmentId' in context && isReferenceAttachmentId(context.attachmentId);
};

/**
 * A type narrowing function for value-based unified attachment.
 */
export const isUnifiedValueAttachmentRequest = (
  context: AttachmentRequestV2
): context is UnifiedValueAttachmentPayload => {
  return 'data' in context && context.data !== null && typeof context.data === 'object';
};

/**
 * A type narrowing function for unified attachment (either reference or value-based).
 */
export const isUnifiedAttachmentRequest = (
  context: AttachmentRequestV2
): context is UnifiedAttachmentPayload => {
  return isUnifiedReferenceAttachmentRequest(context) || isUnifiedValueAttachmentRequest(context);
};

// ------ Comment -------
export const isCommentAttachmentType = (type: string): boolean =>
  type === AttachmentType.user || type === COMMENT_ATTACHMENT_TYPE;

export const isUnifiedCommentAttachment = (
  attachment: AttachmentRequestV2
): attachment is UnifiedValueAttachmentPayload & {
  type: 'comment';
  data: { content: string };
} =>
  isUnifiedValueAttachmentRequest(attachment) &&
  attachment.type === COMMENT_ATTACHMENT_TYPE &&
  typeof attachment.data.content === 'string';

// ------ Event -------
export const isEventAttachmentType = (type: string): boolean =>
  type === AttachmentType.event || type === SECURITY_EVENT_ATTACHMENT_TYPE;

export const isUnifiedEventAttachment = (
  attachment: AttachmentRequestV2
): attachment is UnifiedReferenceAttachmentPayload =>
  isUnifiedReferenceAttachmentRequest(attachment) && isEventAttachmentType(attachment.type);
