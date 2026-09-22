/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiTarget } from '@kbn/agent-builder-common';
import { getRegistries } from './registry';
import type { ApiRegistry, ApiRegistryMeta } from './types';

export interface ApiSummary {
  api: string;
  name: string;
  namespace: string | null;
  description: string;
}

/**
 * Filters a registry manifest down to the operations matching a free-text search.
 *
 * @param manifest - The target registry's manifest.
 * @param search - Keyword matched case-insensitively against each entry's identifier, name,
 * namespace, and description. Every entry is returned when it is omitted or blank.
 * @returns One summary per matching operation, in manifest order.
 */
export const listApis = (manifest: readonly ApiRegistryMeta[], search?: string): ApiSummary[] => {
  const searchTerm = search?.toLowerCase().trim();

  return manifest
    .filter((entry) => {
      if (!searchTerm) return true;
      return (
        entry.name.toLowerCase().includes(searchTerm) ||
        (entry.namespace ?? '').toLowerCase().includes(searchTerm) ||
        entry.description.toLowerCase().includes(searchTerm) ||
        entry.id.toLowerCase().includes(searchTerm)
      );
    })
    .map((entry) => ({
      api: entry.id,
      name: entry.name,
      namespace: entry.namespace ?? null,
      description: entry.description,
    }));
};

export type ListApisResult =
  | { status: 'listed'; apis: ApiSummary[] }
  | { status: 'registry_unavailable'; error: unknown };

/**
 * Searches the manifest of the given target's registry.
 *
 * @param target - Backend to list APIs for.
 * @param search - Keyword to filter by, as accepted by {@link listApis}.
 * @returns The matching operations, or the reason the registry could not be reached.
 */
export const listApisForTarget = async (
  target: ApiTarget,
  search?: string
): Promise<ListApisResult> => {
  let registries: Record<ApiTarget, ApiRegistry>;
  try {
    registries = await getRegistries();
  } catch (error) {
    return { status: 'registry_unavailable', error };
  }

  return { status: 'listed', apis: listApis(registries[target].manifest, search) };
};
