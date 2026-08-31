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

/** Normalizes SO `ecs_mapping` (array or record) to the record form used on live-query bodies. */
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

export interface ResolvedQueryReference {
  query?: string;
  queries?: string[];
  ecs_mapping?: Record<string, unknown>;
}

/**
 * Resolves a saved query or pack via the internal space-scoped SO client.
 * `run_saved_queries` grants no SO read, so the caller's credentials cannot load the object.
 */
export const resolveQueryReference = async (
  coreStart: CoreStart,
  spaceId: string | undefined,
  reference: { saved_query_id?: string; pack_id?: string }
): Promise<ResolvedQueryReference | undefined> => {
  const { saved_query_id: savedQueryId, pack_id: packId } = reference;

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
