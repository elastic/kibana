/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { PolicyFromES } from './policies';

export const ILM_API_BASE_PATH = '/api/index_lifecycle_management';

export interface IlmApiClient {
  getPolicies(options?: { signal?: AbortSignal }): Promise<PolicyFromES[]>;
}

/**
 * Creates a minimal typed ILM API client for cross-plugin usage.
 */
export function createIlmApiClient(core: CoreStart | CoreSetup): IlmApiClient {
  return {
    getPolicies: async (options?: { signal?: AbortSignal }) => {
      return await core.http.get<PolicyFromES[]>(`${ILM_API_BASE_PATH}/policies`, {
        signal: options?.signal,
      });
    },
  };
}
