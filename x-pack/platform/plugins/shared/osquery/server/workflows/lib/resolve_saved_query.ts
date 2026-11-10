/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PreDispatchErrorCode } from '../../../common/workflows/contract/error_codes';
import { PUBLIC_API_HEADERS } from './api_headers';
import { stepError, toPreDispatchReadError } from './errors';
import type { KibanaApiCaller } from './types';

export interface ResolvedSavedQuery {
  id: string;
  query: string;
  ecs_mapping?: Record<string, unknown>;
  timeout?: number;
}

interface FindSavedQueriesResponse {
  data?: Array<{
    id: string;
    query: string;
    ecs_mapping?: Record<string, unknown>;
    timeout?: number;
  }>;
}

/** A saved query is runnable as is only when its SQL has no `{{field}}` placeholders. */
export const hasPlaceholders = (sql: string): boolean => /\{\{[\s\S]*?\}\}/.test(sql);

/**
 * Finds the saved query by exact name (its `id` attribute) in the workflow's space. The lookup
 * is an exact phrase on a keyword field: never a `search=`, which is fuzzy.
 */
export const resolveSavedQuery = async (
  contextManager: KibanaApiCaller,
  name: string
): Promise<ResolvedSavedQuery> => {
  // Templates are rendered after schema validation, so `saved_query` can still be empty here.
  // The find route treats an empty `id` as "no filter" and would list every saved query.
  if (name.trim() === '' || name.includes('/')) {
    throw stepError(
      PreDispatchErrorCode.SAVED_QUERY_NOT_FOUND,
      'saved_query is empty or invalid after rendering the workflow templates.',
      'NotFoundError'
    );
  }

  let matches: NonNullable<FindSavedQueriesResponse['data']>;
  try {
    const { body } = await contextManager.callKibanaApi<FindSavedQueriesResponse>({
      method: 'GET',
      path: '/api/osquery/saved_queries',
      query: { id: name, page: 1, pageSize: 2 },
      headers: PUBLIC_API_HEADERS,
    });
    // Exact name only: whatever the route returns, never run a query with another name.
    matches = (body.data ?? []).filter((savedQuery) => savedQuery.id === name);
  } catch (error) {
    throw toPreDispatchReadError(`Reading the saved query "${name}"`, error);
  }

  if (matches.length === 0) {
    throw stepError(
      PreDispatchErrorCode.SAVED_QUERY_NOT_FOUND,
      `Saved query "${name}" was not found in this space. If it ships with an integration, install the integration assets in this space.`,
      'NotFoundError'
    );
  }

  if (matches.length > 1) {
    throw stepError(
      PreDispatchErrorCode.SAVED_QUERY_AMBIGUOUS,
      `More than one saved query is named "${name}" in this space. Rename the duplicates.`
    );
  }

  const [savedQuery] = matches;
  if (hasPlaceholders(savedQuery.query)) {
    throw stepError(
      PreDispatchErrorCode.SAVED_QUERY_HAS_PLACEHOLDERS,
      `Saved query "${name}" contains {{…}} placeholders, which workflow steps never substitute.`
    );
  }

  return {
    id: savedQuery.id,
    query: savedQuery.query,
    ...(savedQuery.ecs_mapping ? { ecs_mapping: savedQuery.ecs_mapping } : {}),
    ...(savedQuery.timeout ? { timeout: savedQuery.timeout } : {}),
  };
};
