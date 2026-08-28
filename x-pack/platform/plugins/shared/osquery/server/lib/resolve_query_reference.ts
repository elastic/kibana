/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../common/types';
import type { PackSavedObject, SavedQuerySavedObject } from '../common/types';
import { getInternalSavedObjectsClientForSpaceId } from '../utils/get_internal_saved_object_client';

/**
 * Normalizes saved-object `ecs_mapping` (array `{ key, value }` or record) to the
 * record form used on live-query request bodies, so callers can be compared against
 * stored content without depending on which shape the SO happens to hold.
 */
export const toEcsMappingRecord = (
  mapping:
    | Array<{ key: string; value: Record<string, object> }>
    | Record<string, unknown>
    | undefined
): Record<string, unknown> | undefined => {
  if (!mapping) {
    return undefined;
  }

  if (Array.isArray(mapping)) {
    if (!mapping.length) {
      return undefined;
    }

    return mapping.reduce<Record<string, unknown>>((acc, { key, value }) => {
      acc[key] = value;

      return acc;
    }, {});
  }

  return Object.keys(mapping).length ? mapping : undefined;
};

/**
 * The query content backing an authorized `saved_query_id` / `pack_id` reference.
 *
 * `queries` is populated for packs (which hold many queries); `query` and `ecs_mapping`
 * are populated for saved queries. Callers authorized only by `runSavedQueries` dispatch
 * this content instead of anything they supplied themselves.
 */
export interface ResolvedQueryReference {
  query?: string;
  queries?: string[];
  ecs_mapping?: Record<string, unknown>;
}

/**
 * Resolves a `saved_query_id` or `pack_id` to its stored query content.
 *
 * Resolution deliberately uses the internal, space-scoped saved objects client. The
 * `run_saved_queries` sub-feature privilege grants no saved object read access
 * (`savedObject: { all: [], read: [] }` in register_features.ts), so a user holding only
 * that privilege genuinely cannot read the referenced object with their own credentials.
 * Reading it internally lets us derive trusted query content without granting the caller
 * any visibility into the object. Space scoping is preserved, so a reference that lives in
 * another space does not resolve.
 *
 * @returns the stored query content, or `undefined` when the reference does not resolve.
 */
export const resolveQueryReference = async (
  coreStart: CoreStart,
  spaceId: string | undefined,
  reference: { saved_query_id?: string; pack_id?: string }
): Promise<ResolvedQueryReference | undefined> => {
  const { saved_query_id: savedQueryId, pack_id: packId } = reference;

  // A blank or whitespace-only id is not a reference. Guarding here keeps the
  // "presence implies authorization" bug from reappearing at the resolution layer.
  const trimmedSavedQueryId = savedQueryId?.trim();
  const trimmedPackId = packId?.trim();

  if (!trimmedSavedQueryId && !trimmedPackId) {
    return undefined;
  }

  const soClient = getInternalSavedObjectsClientForSpaceId(coreStart, spaceId ?? DEFAULT_SPACE_ID);

  try {
    if (trimmedPackId) {
      const packSO = await soClient.get<PackSavedObject>(packSavedObjectType, trimmedPackId);

      return {
        queries: (packSO.attributes.queries ?? []).map(({ query }) => query),
      };
    }

    const savedQuerySO = await soClient.get<SavedQuerySavedObject>(
      savedQuerySavedObjectType,
      trimmedSavedQueryId as string
    );

    return {
      query: savedQuerySO.attributes.query,
      ecs_mapping: toEcsMappingRecord(savedQuerySO.attributes.ecs_mapping),
    };
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
};
