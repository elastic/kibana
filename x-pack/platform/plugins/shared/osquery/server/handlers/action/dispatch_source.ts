/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { CreateLiveQueryRequestBodySchema } from '../../../common/api';
import {
  PACK_LOOKUP_FAILED,
  PACK_NOT_FOUND,
  SAVED_QUERY_LOOKUP_FAILED,
  SAVED_QUERY_NOT_FOUND,
} from '../../../common/translations/errors';
import { lookupSavedQuery, type ResolvedQueryReference } from '../../lib/resolve_query_reference';
import { packSavedObjectType } from '../../../common/types';
import type { PackSavedObject } from '../../common/types';

export type UnresolvedReferenceError =
  | typeof SAVED_QUERY_NOT_FOUND
  | typeof SAVED_QUERY_LOOKUP_FAILED
  | typeof PACK_NOT_FOUND
  | typeof PACK_LOOKUP_FAILED;

export type DispatchSource =
  | { kind: 'caller' }
  | { kind: 'investigation_guide' }
  | { kind: 'saved_query'; savedQueryId: string; stored: ResolvedQueryReference }
  | { kind: 'pack'; packSavedObjectId: string }
  | { kind: 'unresolved'; referenceId: string; error: UnresolvedReferenceError };

export type DispatchEntryPoint =
  | { entryPoint: 'live_query'; source: Exclude<DispatchSource, { kind: 'unresolved' }> }
  | { entryPoint: 'rule_run'; preflight?: ResolvedQueryReference };

/**
 * Derives the dispatch source for a rule-run response action. Called from `createActionHandler`
 * when dispatch.entryPoint === 'rule_run'. Reuses the `containsDynamicQueries` preflight result
 * to avoid a second SO lookup.
 *
 * Pack wins over saved_query_id (matches `resolveQueryReference` precedence).
 */
export const resolveRuleRunDispatchSource = async (
  params: CreateLiveQueryRequestBodySchema,
  preflight: ResolvedQueryReference | undefined,
  soClient: Pick<SavedObjectsClientContract, 'find' | 'resolve' | 'get'>
): Promise<DispatchSource> => {
  const packId = params.pack_id?.trim();
  const savedQueryId = params.saved_query_id?.trim();

  if (!packId && !savedQueryId) {
    return { kind: 'caller' };
  }

  // Reuse pre-fetched preflight when available
  if (preflight) {
    if (preflight.isPack) {
      return { kind: 'pack', packSavedObjectId: preflight.savedObjectId };
    }

    // preflight is a saved query reference
    if (savedQueryId) {
      if (preflight.query == null) {
        return { kind: 'unresolved', referenceId: savedQueryId, error: SAVED_QUERY_NOT_FOUND };
      }

      return { kind: 'saved_query', savedQueryId, stored: preflight };
    }
  }

  // No preflight — resolve the reference now
  if (packId) {
    try {
      const packSO = await soClient.get<PackSavedObject>(packSavedObjectType, packId);

      return { kind: 'pack', packSavedObjectId: packSO.id };
    } catch (error) {
      return {
        kind: 'unresolved',
        referenceId: packId,
        error: SavedObjectsErrorHelpers.isNotFoundError(error)
          ? PACK_NOT_FOUND
          : PACK_LOOKUP_FAILED,
      };
    }
  }

  // saved_query_id only
  try {
    const stored = await lookupSavedQuery(soClient, savedQueryId as string);

    if (!stored) {
      return {
        kind: 'unresolved',
        referenceId: savedQueryId as string,
        error: SAVED_QUERY_NOT_FOUND,
      };
    }

    if (stored.query == null) {
      return {
        kind: 'unresolved',
        referenceId: savedQueryId as string,
        error: SAVED_QUERY_NOT_FOUND,
      };
    }

    return { kind: 'saved_query', savedQueryId: savedQueryId as string, stored };
  } catch (error) {
    return {
      kind: 'unresolved',
      referenceId: savedQueryId as string,
      error: SAVED_QUERY_LOOKUP_FAILED,
    };
  }
};
