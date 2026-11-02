/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  InvalidateAPIKeyResult,
  InvalidateAPIKeysParams,
  InvalidateUiamAPIKeyParams,
} from '@kbn/security-plugin-types-server';

export type ApiKeyInvalidationFn = (
  params: InvalidateAPIKeysParams
) => Promise<InvalidateAPIKeyResult | null> | undefined;

export type UiamApiKeyInvalidationFn = (
  request: KibanaRequest,
  params: InvalidateUiamAPIKeyParams
) => Promise<InvalidateAPIKeyResult | null>;

export interface ApiKeyPendingInvalidation {
  apiKeyId: string;
  createdAt: string;
  uiamApiKey?: string;
  taskId?: string;
  taskStartedAt?: string;
}

export interface RunningTask {
  taskId: string;
  taskStartedAt: string;
}

/**
 * Returns the ids of the pending invalidation SOs whose key is still used by an in-progress task run.
 */
export type GetSOIdsUsedByRunningTasksFn = (
  runningTasksBySOId: Map<string, RunningTask>,
  savedObjectsClient: SavedObjectsClientContract
) => Promise<Set<string>>;
