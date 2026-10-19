/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { PreDispatchErrorCode } from '../../../common/workflows/contract/error_codes';
import { INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from './api_headers';
import { stepError, toPreDispatchReadError } from './errors';
import { hasPlaceholders } from './resolve_saved_query';
import type { KibanaApiCaller } from './types';

export interface ResolvedPack {
  /** Saved-object id of the pack the live query is created from. */
  packId: string;
  /** Per pack query: the keys of its `ecs_mapping`. Disabled queries are not listed. */
  ecsKeysByQuery: Record<string, string[]>;
}

interface ReadPackResponse {
  data?: {
    queries?: Record<
      string,
      { query?: string; ecs_mapping?: Record<string, unknown>; enabled?: boolean }
    >;
  };
}

const isNotFound = (error: unknown): boolean =>
  error instanceof KibanaApiCallError && error.status === 404;

const isConflict = (error: unknown): boolean =>
  error instanceof KibanaApiCallError && error.status === 409;

const resolvePrebuiltPackId = async (
  contextManager: KibanaApiCaller,
  assetId: string
): Promise<string> => {
  try {
    const { body } = await contextManager.callKibanaApi<{ pack_id: string }>({
      method: 'GET',
      path: `/internal/osquery/packs/_resolve_prebuilt/${encodeURIComponent(assetId)}`,
      headers: INTERNAL_API_HEADERS,
    });

    return body.pack_id;
  } catch (error) {
    if (isNotFound(error)) {
      throw stepError(
        PreDispatchErrorCode.PREBUILT_PACK_NOT_LOADED,
        `Prebuilt pack "${assetId}" is not loaded in this space. Load Elastic prebuilt packs in this space.`,
        'NotFoundError'
      );
    }

    if (isConflict(error)) {
      throw stepError(
        PreDispatchErrorCode.PREBUILT_PACK_AMBIGUOUS,
        `More than one prebuilt pack is named "${assetId}". Use its asset id instead.`
      );
    }

    throw toPreDispatchReadError(`Resolving the prebuilt pack "${assetId}"`, error);
  }
};

/**
 * Finds the pack in the workflow's space and checks that none of its enabled queries has
 * `{{…}}` placeholders. A disabled pack still runs: `enabled` only affects Fleet scheduling.
 */
export const resolvePack = async (
  contextManager: KibanaApiCaller,
  input: { pack_id?: string; prebuilt_pack?: string }
): Promise<ResolvedPack> => {
  const packId =
    input.pack_id ?? (await resolvePrebuiltPackId(contextManager, input.prebuilt_pack as string));

  let queries: NonNullable<NonNullable<ReadPackResponse['data']>['queries']>;
  try {
    const { body } = await contextManager.callKibanaApi<ReadPackResponse>({
      method: 'GET',
      path: `/api/osquery/packs/${encodeURIComponent(packId)}`,
      headers: PUBLIC_API_HEADERS,
    });
    queries = body.data?.queries ?? {};
  } catch (error) {
    if (isNotFound(error)) {
      throw stepError(
        PreDispatchErrorCode.PACK_NOT_FOUND,
        `Pack "${packId}" was not found in this space.`,
        'NotFoundError'
      );
    }

    throw toPreDispatchReadError(`Reading the pack "${packId}"`, error);
  }

  const ecsKeysByQuery: Record<string, string[]> = {};
  for (const [name, packQuery] of Object.entries(queries)) {
    if (packQuery.enabled === false) continue;
    if (hasPlaceholders(packQuery.query ?? '')) {
      throw stepError(
        PreDispatchErrorCode.SAVED_QUERY_HAS_PLACEHOLDERS,
        `Query "${name}" of pack "${packId}" contains {{…}} placeholders, which workflow steps never substitute.`
      );
    }

    ecsKeysByQuery[name] = Object.keys(packQuery.ecs_mapping ?? {});
  }

  return { packId, ecsKeysByQuery };
};
