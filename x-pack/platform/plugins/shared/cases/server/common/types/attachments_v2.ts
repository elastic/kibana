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
export type { AttachmentAttributesV2, UnifiedAttachmentAttributes };
export type { AttachmentPersistedAttributes } from './attachments_v1';
/**
 * Common attributes shared between old and new attachment schemas.
 * Preserved during transformation.
 */
export interface CommonAttributes {
  created_at: string;
  created_by: {
    username: string;
    full_name?: string | null;
    email?: string | null;
    profile_uid?: string | null;
  };
  pushed_at?: string | null;
  pushed_by?: {
    username: string;
    full_name?: string | null;
    email?: string | null;
    profile_uid?: string | null;
  } | null;
  updated_at?: string | null;
  updated_by?: {
    username: string;
    full_name?: string | null;
    email?: string | null;
    profile_uid?: string | null;
  } | null;
}

export type UnifiedAttachmentPersistedAttributes = UnifiedAttachmentAttributes & CommonAttributes;
export type UnifiedAttachmentSavedObjectTransformed = SavedObject<UnifiedAttachmentAttributes>;

export type AttachmentTransformedAttributesV2 = AttachmentAttributesV2;
export type AttachmentSavedObjectTransformedV2 = SavedObject<AttachmentTransformedAttributesV2>;
