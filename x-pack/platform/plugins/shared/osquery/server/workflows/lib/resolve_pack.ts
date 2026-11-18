/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { isPackQueryEnabled } from '../../../common/pack_execution';
import { PREBUILT_PACK_RESOLVE_REASON } from '../../../common/prebuilt_packs';
import { PreDispatchErrorCode } from '../../../common/workflows/contract/error_codes';
import { INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from './api_headers';
import { stepError, toPreDispatchReadError } from './errors';
import { hasPlaceholders } from './resolve_saved_query';
import type { KibanaApiCaller } from './types';

export interface ResolvedPack {
  /** Saved-object id of the pack the live query is created from. */
  packId: string;
}

interface ReadPackResponse {
  data?: {
    queries?: Record<string, { query?: string; enabled?: boolean }>;
  };
}

const isStatus = (error: unknown, status: number): error is KibanaApiCallError =>
  error instanceof KibanaApiCallError && error.status === status;

const notFoundReason = (error: KibanaApiCallError): unknown =>
  (error.body as { attributes?: { reason?: unknown } } | undefined)?.attributes?.reason;

interface FindPacksResponse {
  total?: number;
  data?: Array<{ saved_object_id: string; name: string }>;
}

const FIND_PAGE_SIZE = 100;
const FIND_MAX_PAGES = 10;

/**
 * Finds the pack named exactly `name` in the workflow's space, by name like `runQuery`'s
 * `saved_query`: a saved-object id is random per space and changes on re-import. The packs find
 * route only offers a fuzzy `simple_query_string` over name and description, so this searches
 * for the quoted name and keeps exact matches only. Names are unique per space (create and
 * rename answer 409), but a saved-objects import can bypass that, hence the ambiguity check.
 */
const resolvePackIdByName = async (
  contextManager: KibanaApiCaller,
  name: string
): Promise<string> => {
  // Templates are rendered after schema validation, so the value can still be empty here.
  if (name.trim() === '') {
    throw stepError(
      PreDispatchErrorCode.PACK_NOT_FOUND,
      'pack is empty after rendering the workflow templates.',
      'NotFoundError'
    );
  }

  const phrase = `"${name.replace(/["\\]/g, '\\$&')}"`;
  // Punctuation-only names have no searchable terms in the route's analyzer.
  const search = /[\p{L}\p{N}]/u.test(name) ? { search: phrase } : {};
  const ids = new Set<string>();
  // True when the page cap ended the search while the route still had more hits to give.
  let truncated = false;
  try {
    for (let page = 1; page <= FIND_MAX_PAGES; page++) {
      const { body } = await contextManager.callKibanaApi<FindPacksResponse>({
        method: 'GET',
        path: '/api/osquery/packs',
        query: { ...search, page, pageSize: FIND_PAGE_SIZE },
        headers: PUBLIC_API_HEADERS,
      });
      const data = body.data ?? [];
      for (const pack of data) {
        if (pack.name === name) ids.add(pack.saved_object_id);
      }

      if (data.length < FIND_PAGE_SIZE || page * FIND_PAGE_SIZE >= (body.total ?? 0)) break;
      if (page === FIND_MAX_PAGES) truncated = true;
    }
  } catch (error) {
    throw toPreDispatchReadError(`Finding the pack "${name}"`, error);
  }

  // An incomplete search can neither prove the name is missing nor that it is unique: a
  // duplicate (or the match itself) may sit past the cap, so refuse instead of guessing.
  if (truncated) {
    throw stepError(
      PreDispatchErrorCode.PACK_AMBIGUOUS,
      `Too many packs match the name "${name}" to tell which one to run. Use a more specific name.`
    );
  }

  if (ids.size === 0) {
    throw stepError(
      PreDispatchErrorCode.PACK_NOT_FOUND,
      `No pack is named "${name}" in this space.`,
      'NotFoundError'
    );
  }

  if (ids.size > 1) {
    throw stepError(
      PreDispatchErrorCode.PACK_AMBIGUOUS,
      `More than one pack is named "${name}" in this space. Rename the duplicates.`
    );
  }

  const [packId] = ids;

  return packId;
};

const encodePackPathId = (id: string): string => {
  if (
    id === '.' ||
    id === '..' ||
    /[/\\]|%(?:2f|5c)/i.test(id) ||
    Array.from(id).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  ) {
    throw stepError(
      PreDispatchErrorCode.INVALID_INPUT,
      'Pack identifier is not a valid URL path segment.'
    );
  }

  try {
    return encodeURIComponent(id);
  } catch {
    throw stepError(
      PreDispatchErrorCode.INVALID_INPUT,
      'Pack identifier is not a valid URL path segment.'
    );
  }
};

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

  const encodedId = encodePackPathId(assetIdOrName);
  try {
    const { body } = await contextManager.callKibanaApi<{ pack_id: string }>({
      method: 'GET',
      path: `/internal/osquery/packs/_resolve_prebuilt/${encodedId}`,
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
  input: { pack?: string; prebuilt_pack?: string }
): Promise<ResolvedPack> => {
  const packId =
    input.pack !== undefined
      ? await resolvePackIdByName(contextManager, input.pack)
      : await resolvePrebuiltPackId(contextManager, input.prebuilt_pack as string);
  // Messages name the pack the way the workflow does, not by its saved-object id.
  const label = input.pack ?? (input.prebuilt_pack as string);

  const encodedPackId = encodePackPathId(packId);
  let queries: NonNullable<NonNullable<ReadPackResponse['data']>['queries']>;
  try {
    const { body } = await contextManager.callKibanaApi<ReadPackResponse>({
      method: 'GET',
      path: `/api/osquery/packs/${encodedPackId}`,
      headers: PUBLIC_API_HEADERS,
    });
    queries = body.data?.queries ?? {};
  } catch (error) {
    if (isStatus(error, 404)) {
      throw stepError(
        PreDispatchErrorCode.PACK_NOT_FOUND,
        `Pack "${label}" was not found in this space.`,
        'NotFoundError'
      );
    }

    throw toPreDispatchReadError(`Reading the pack "${label}"`, error);
  }

  const enabledQueries = Object.entries(queries).filter(([, query]) => isPackQueryEnabled(query));
  for (const [name, packQuery] of enabledQueries) {
    if (hasPlaceholders(packQuery.query ?? '')) {
      throw stepError(
        PreDispatchErrorCode.PACK_QUERY_HAS_PLACEHOLDERS,
        `Query "${name}" of pack "${label}" contains {{…}} placeholders, which workflow steps never substitute.`
      );
    }
  }

  if (enabledQueries.length === 0) {
    throw stepError(
      PreDispatchErrorCode.PACK_HAS_NO_ENABLED_QUERIES,
      `Pack "${label}" has no enabled queries, so there is nothing to run.`
    );
  }

  return { packId };
};
