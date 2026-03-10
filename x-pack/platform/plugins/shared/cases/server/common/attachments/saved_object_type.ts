/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import type { ConfigType } from '../../config';
import type { AttachmentPersistedAttributes } from '../types/attachments_v1';
import type { UnifiedAttachmentAttributes } from '../types/attachments_v2';

/**
 * Determines which saved object type should be used for a given attachment type
 * based on the feature flag and migration status.
 *
 * @param config - The cases plugin configuration
 * @param attachmentType - Optional attachment type. If not provided, returns the default SO type.
 * @returns The saved object type to use ('cases-attachments' or 'cases-comments')
 */
export function getAttachmentSavedObjectType(
  config: ConfigType
): typeof CASE_ATTACHMENT_SAVED_OBJECT | typeof CASE_COMMENT_SAVED_OBJECT {
  // If feature flag is disabled, always use old SO type
  if (config.attachments?.enabled) {
    return CASE_ATTACHMENT_SAVED_OBJECT;
  }
  return CASE_COMMENT_SAVED_OBJECT;
}

/**
 * Resolves which saved object type contains the attachment by id.
 * Tries the new SO type first, then falls back to the old SO type.
 *
 * @param client - The saved objects client
 * @param attachmentId - The attachment ID to check
 * @returns The saved object type where the attachment exists, or null if not found
 */
export async function resolveAttachmentSavedObjectType(
  client: SavedObjectsClientContract,
  attachmentId: string
): Promise<typeof CASE_ATTACHMENT_SAVED_OBJECT | typeof CASE_COMMENT_SAVED_OBJECT | null> {
  try {
    await client.get<UnifiedAttachmentAttributes>(CASE_ATTACHMENT_SAVED_OBJECT, attachmentId);
    return CASE_ATTACHMENT_SAVED_OBJECT;
  } catch (error) {
    const isNotFound =
      (error as { statusCode?: number })?.statusCode === 404 ||
      (error as { output?: { statusCode?: number } })?.output?.statusCode === 404;
    if (isNotFound) {
      try {
        await client.get<AttachmentPersistedAttributes>(CASE_COMMENT_SAVED_OBJECT, attachmentId);
        return CASE_COMMENT_SAVED_OBJECT;
      } catch {
        return null;
      }
    }
    throw error;
  }
}
