/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiTarget } from '@kbn/agent-builder-common';
import { getRegistries } from './registry';
import type { ApiRegistry, LoadedApi } from './types';

export const isUnknownApiError = (err: unknown): err is Error =>
  err instanceof Error && err.name === 'UnknownApiError';

export type LoadApiFailure =
  | { status: 'registry_unavailable'; error: unknown }
  | { status: 'unknown_api' }
  | { status: 'load_failed'; error: unknown };

export type LoadApiResult = { status: 'loaded'; loaded: LoadedApi } | LoadApiFailure;

/**
 * Loads an API definition out of the registry of the given target.
 *
 * @param target - Backend the API belongs to.
 * @param api - API identifier, formed from the namespace and name (e.g. `"indices.create"`).
 * @returns The loaded API, or the reason it could not be loaded.
 */
export const loadApi = async (target: ApiTarget, api: string): Promise<LoadApiResult> => {
  let registries: Record<ApiTarget, ApiRegistry>;
  try {
    registries = await getRegistries();
  } catch (error) {
    return { status: 'registry_unavailable', error };
  }

  try {
    return { status: 'loaded', loaded: await registries[target].loadApi(api) };
  } catch (error) {
    return isUnknownApiError(error) ? { status: 'unknown_api' } : { status: 'load_failed', error };
  }
};
