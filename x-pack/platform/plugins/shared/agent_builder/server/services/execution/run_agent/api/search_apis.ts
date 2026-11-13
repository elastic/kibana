/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiTarget } from '@kbn/agent-builder-common';
import { getRegistries } from './registry';
import { getApiSearchIndex } from './search_index';
import type { ApiRegistry } from './types';

export const DISCOVER_RESULT_LIMIT = 10;

export interface ApiSummary {
  api: string;
  name: string;
  namespace: string | null;
  description: string;
}

/**
 * Ranks a registry's operations against a free-text search.
 *
 * @param registry - The target registry to search.
 * @param search - Natural language description or (partial) API identifier.
 * @param limit - Maximum number of operations to return.
 * @returns A summary of the top `limit` operations, most relevant first.
 */
export const searchApis = (
  registry: ApiRegistry,
  search: string,
  limit: number = DISCOVER_RESULT_LIMIT
): ApiSummary[] =>
  getApiSearchIndex(registry)
    .search(search, limit)
    .map((entry) => ({
      api: entry.id,
      name: entry.name,
      namespace: entry.namespace ?? null,
      description: entry.description,
    }));

export type SearchApisResult =
  | { status: 'searched'; apis: ApiSummary[] }
  | { status: 'registry_unavailable'; error: unknown };

/**
 * Searches the registry of the given target.
 *
 * @param target - Backend to search APIs for.
 * @param search - Free-text search, as accepted by {@link searchApis}.
 * @returns The matching operations, or the reason the registry could not be reached.
 */
export const searchApisForTarget = async (
  target: ApiTarget,
  search: string
): Promise<SearchApisResult> => {
  let registries: Record<ApiTarget, ApiRegistry>;
  try {
    registries = await getRegistries();
  } catch (error) {
    return { status: 'registry_unavailable', error };
  }

  return { status: 'searched', apis: searchApis(registries[target], search) };
};
