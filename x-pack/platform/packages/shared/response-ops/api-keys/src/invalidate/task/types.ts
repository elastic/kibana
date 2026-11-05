/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  InvalidateAPIKeyResult,
  InvalidateAPIKeysParams,
  InvalidateUiamAPIKeyParams,
} from '@kbn/core-security-server';

/** Attributes of a pending-invalidation saved object. */
export interface PendingApiKeyInvalidation {
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
 * Given the pending saved objects whose key was replaced during a task run, returns the ids of
 * those whose run is still in progress. That run keeps using the replaced key until it finishes.
 */
export type GetIdsUsedByRunningTasks = (
  runningTasksBySOId: Map<string, RunningTask>
) => Promise<Set<string>>;

export type ApiKeyInvalidationFn = (
  params: InvalidateAPIKeysParams
) => Promise<InvalidateAPIKeyResult | null> | undefined;

export type UiamApiKeyInvalidationFn = (
  request: KibanaRequest,
  params: InvalidateUiamAPIKeyParams
) => Promise<InvalidateAPIKeyResult | null>;

export interface SavedObjectTypesToQuery {
  type: string;
  apiKeyAttributePath: string;
}
