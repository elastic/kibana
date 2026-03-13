/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Server-side attribute types for the unified attachment schema (v2) and
 * schema transformation between CASE_COMMENT_SAVED_OBJECT and CASE_ATTACHMENT_SAVED_OBJECT.
 * Attribute shapes live here; conversion logic lives in common/attachments/.
 */

import type { SavedObject } from '@kbn/core/server';
import type {
  AttachmentAttributesV2,
  UnifiedAttachmentAttributes,
} from '../../../common/types/domain/attachment/v2';
import type { CommonAttributes } from './attachments_v1';
export type { AttachmentAttributesV2, UnifiedAttachmentAttributes };
export type { AttachmentPersistedAttributes, CommonAttributes } from './attachments_v1';

export type UnifiedAttachmentPersistedAttributes = UnifiedAttachmentAttributes & CommonAttributes;
export type UnifiedAttachmentSavedObjectTransformed =
  SavedObject<UnifiedAttachmentPersistedAttributes>;

export type AttachmentTransformedAttributesV2 = AttachmentAttributesV2;
export type AttachmentSavedObjectTransformedV2 = SavedObject<AttachmentTransformedAttributesV2>;
