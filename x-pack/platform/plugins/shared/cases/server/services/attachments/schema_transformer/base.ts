/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentAttributesV2 } from '../../../../common/types/domain/attachment/v2';
import type { CommonAttributes } from '../../../common/types/attachments_v2';
export type { CommonAttributes } from '../../../common/types/attachments_v2';

/**
 * Base interface for attachment type transformers.
 * Each migrated attachment type should implement its own transformer.
 * TOld / TNew are not constrained to CommonAttributes so that AttachmentPersistedAttributes
 * and AttachmentAttributesV2 can be used (their shapes are compatible at runtime).
 */
export interface AttachmentTypeTransformer<TOld = unknown, TNew = unknown> {
  /**
   * Transforms old schema attributes to new schema format.
   * Used when writing to the new SO type.
   * Accepts unknown so callers can pass combined/decoded attributes from codecs.
   */
  toNewSchema(attributes: unknown): TNew;

  /**
   * Transforms new schema attributes to old schema format.
   * Used when reading from new SO and need to return old format for backward compatibility.
   * Accepts unknown so callers can pass combined/decoded attributes from codecs.
   * Owner can be derived from attributes when present; optional owner is used as fallback (e.g. from bulkCreate).
   */
  toOldSchema(attributes: unknown, owner?: string): TOld;
  /**
   * Checks if the given attributes represent this attachment type.
   */
  isType(attributes: AttachmentAttributesV2): boolean;

  isNewType(attributes: TNew): boolean;

  isOldType(attributes: TOld): boolean;
}

/**
 * Extracts common attributes from either old or new schema.
 *
 * @param attributes - The attachment attributes (old or new schema)
 * @returns The common attributes
 */
export function extractCommonAttributes(
  attributes: AttachmentAttributesV2
): CommonAttributes {
  const createdBy = attributes.created_by;
  const pushedBy = attributes.pushed_by;
  const updatedBy = attributes.updated_by;

  return {
    created_at: attributes.created_at,
    created_by: {
      username: createdBy.username || '',
      full_name: createdBy.full_name,
      email: createdBy.email,
      profile_uid: createdBy.profile_uid,
    },
    pushed_at: attributes.pushed_at ?? null,
    pushed_by: pushedBy
      ? {
          username: pushedBy.username || '',
          full_name: pushedBy.full_name,
          email: pushedBy.email,
          profile_uid: pushedBy.profile_uid,
        }
      : null,
    updated_at: attributes.updated_at ?? null,
    updated_by: updatedBy
      ? {
          username: updatedBy.username || '',
          full_name: updatedBy.full_name,
          email: updatedBy.email,
          profile_uid: updatedBy.profile_uid,
        }
      : null,
  };
}
