/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { decodeStoredApiKey, getUiamApiKeyId, getUiamApiKeySecret } from './stored_api_key';
export { getApiKeyFromRequest } from './request_api_key';
export type { RequestApiKeyCredentials } from './request_api_key';
export { buildApiKeyFakeRequest } from './fake_request';
export type { BuildApiKeyFakeRequestOpts } from './fake_request';
export { getApiKeyInvalidationTargets } from './invalidation/get_api_key_invalidation_targets';
export type {
  ApiKeyInvalidationTarget,
  GetApiKeyInvalidationTargetsOpts,
} from './invalidation/get_api_key_invalidation_targets';
export { runInvalidate } from './invalidation/run_invalidate';
export type { RunInvalidateResult, SavedObjectTypesToQuery } from './invalidation/run_invalidate';
export type {
  ApiKeyInvalidationFn,
  ApiKeyPendingInvalidation,
  GetSOIdsUsedByRunningTasksFn,
  RunningTask,
  UiamApiKeyInvalidationFn,
} from './invalidation/types';
