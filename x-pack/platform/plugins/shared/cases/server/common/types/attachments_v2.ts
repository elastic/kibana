/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Server-side attribute types for the unified attachment schema (v2) and
 * schema transformation between CASE_COMMENT_SAVED_OBJECT and CASE_ATTACHMENT_SAVED_OBJECT.
 * Attribute shapes live here; conversion logic lives in schema_transformer/.
 */

import type { SavedObject } from '@kbn/core/server';
import type {
  AttachmentAttributesV2,
  UnifiedAttachmentAttributes,
} from '../../../common/types/domain/attachment/v2';
export type { AttachmentAttributesV2, UnifiedAttachmentAttributes };

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

/**
 * Persisted attributes for the old schema (CASE_COMMENT_SAVED_OBJECT).
 * Re-exported from v1 for a single place to import both old and new schema types.
 */
export type { AttachmentPersistedAttributes } from './attachments_v1';

/**
 * Persisted attributes for the unified schema (CASE_ATTACHMENT_SAVED_OBJECT).
 * Re-exported from domain for server use.
 */
export type UnifiedAttachmentSavedObjectTransformed = SavedObject<UnifiedAttachmentAttributes>;
