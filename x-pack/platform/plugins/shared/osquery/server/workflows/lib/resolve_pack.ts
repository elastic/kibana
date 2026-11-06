/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { PREBUILT_PACK_RESOLVE_REASON } from '../../../common/prebuilt_packs';
import { PreDispatchErrorCode } from '../../../common/workflows/contract/error_codes';
import { INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from './api_headers';
import { stepError, toPreDispatchReadError } from './errors';
import { hasPlaceholders } from './resolve_saved_query';
import type { KibanaApiCaller } from './types';

export interface ResolvedPack {
  /** Saved-object id of the pack the live query is created from. */
  packId: string;
  /** Per enabled pack query: the keys of its `ecs_mapping`. Disabled queries are not listed. */
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

const isStatus = (error: unknown, status: number): error is KibanaApiCallError =>
  error instanceof KibanaApiCallError && error.status === status;

const notFoundReason = (error: KibanaApiCallError): unknown =>
  (error.body as { attributes?: { reason?: unknown } } | undefined)?.attributes?.reason;

const resolvePrebuiltPackId = async (
  contextManager: KibanaApiCaller,
  assetIdOrName: string
): Promise<string> => {
  // Templates are rendered after schema validation, so the value can still be empty here.
  if (assetIdOrName.trim() === '') {
    throw stepError(
      PreDispatchErrorCode.PREBUILT_PACK_NOT_LOADED,
      'prebuilt_pack is empty after rendering the workflow templates.',
      'NotFoundError'
    );
  }

  try {
    const { body } = await contextManager.callKibanaApi<{ pack_id: string }>({
      method: 'GET',
      path: `/internal/osquery/packs/_resolve_prebuilt/${encodeURIComponent(assetIdOrName)}`,
      headers: INTERNAL_API_HEADERS,
    });

    return body.pack_id;
  } catch (error) {
    if (isStatus(error, 404)) {
      // The route answers 404 both for an unknown name and for a pack not loaded in this space.
      // Same code (the contract has one), but the message tells the user what to fix.
      const message =
        notFoundReason(error) === PREBUILT_PACK_RESOLVE_REASON.unknownAsset
          ? `No prebuilt pack matches "${assetIdOrName}". Use the package name (for example forensic-persistence) or the asset id.`
          : `Prebuilt pack "${assetIdOrName}" is not loaded in this space. Load Elastic prebuilt packs in this space.`;

      throw stepError(PreDispatchErrorCode.PREBUILT_PACK_NOT_LOADED, message, 'NotFoundError');
    }

    if (isStatus(error, 409)) {
      throw stepError(
        PreDispatchErrorCode.PREBUILT_PACK_AMBIGUOUS,
        `Prebuilt pack "${assetIdOrName}" is ambiguous: more than one asset has that name, or this space holds more than one copy of it. Use its asset id, or remove the extra copy.`
      );
    }

    throw toPreDispatchReadError(`Resolving the prebuilt pack "${assetIdOrName}"`, error);
  }
};

/**
 * Finds the pack in the workflow's space and checks it before anything is dispatched: no enabled
 * query has `{{…}}` placeholders (the live-query route would send them to the agents literally,
 * as it has no alert to fill them from) and at least one query is enabled. Disabled queries are
 * skipped by the route, so they are skipped here. A disabled pack still runs: `enabled` only
 * affects Fleet scheduling.
 */
export const resolvePack = async (
  contextManager: KibanaApiCaller,
  input: { pack_id?: string; prebuilt_pack?: string }
): Promise<ResolvedPack> => {
  const packId =
    input.pack_id ?? (await resolvePrebuiltPackId(contextManager, input.prebuilt_pack as string));

  if (packId.trim() === '') {
    throw stepError(
      PreDispatchErrorCode.PACK_NOT_FOUND,
      'pack_id is empty after rendering the workflow templates.',
      'NotFoundError'
    );
  }

  let queries: NonNullable<NonNullable<ReadPackResponse['data']>['queries']>;
  try {
    const { body } = await contextManager.callKibanaApi<ReadPackResponse>({
      method: 'GET',
      path: `/api/osquery/packs/${encodeURIComponent(packId)}`,
      headers: PUBLIC_API_HEADERS,
    });
    queries = body.data?.queries ?? {};
  } catch (error) {
    if (isStatus(error, 404)) {
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

  if (Object.keys(ecsKeysByQuery).length === 0) {
    throw stepError(
      PreDispatchErrorCode.REQUEST_REJECTED,
      `Pack "${packId}" has no enabled queries, so there is nothing to run.`
    );
  }

  return { packId, ecsKeysByQuery };
};
