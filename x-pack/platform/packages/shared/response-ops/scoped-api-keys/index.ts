/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { resolveScopedApiKeys } from './create/resolve_scoped_api_keys';
export { isCloudApiKeyNotSupportedError, reuseRequestApiKey } from './create/reuse_request_api_key';
export { getApiKeyFromRequest } from './create/request_api_key';
export type { RequestApiKeyCredentials } from './create/request_api_key';
export type {
  ResolveScopedApiKeysOpts,
  ResolveScopedApiKeysResult,
  ScopedApiKeyNames,
  ScopedApiKeysDeps,
  ScopedApiKeysMode,
  ScopedCredentials,
  ScopedEsApiKey,
  ScopedUiamApiKey,
} from './create/types';

export { encodeApiKey } from './store/encode_api_key';
export { decodeStoredApiKey, getUiamApiKeyId, getUiamApiKeySecret } from './store/stored_api_key';

export { buildApiKeyFakeRequest } from './use/fake_request';
export type { BuildApiKeyFakeRequestOpts } from './use/fake_request';

export { getApiKeyInvalidationTargets } from './invalidate/get_api_key_invalidation_targets';
export type {
  ApiKeyInvalidationTarget,
  GetApiKeyInvalidationTargetsOpts,
} from './invalidate/get_api_key_invalidation_targets';
export { invalidateApiKeysNow } from './invalidate/invalidate_api_keys_now';
export type {
  InvalidateApiKeysNowDeps,
  InvalidateApiKeysNowOpts,
} from './invalidate/invalidate_api_keys_now';
export { queueApiKeysForInvalidation } from './invalidate/queue_api_keys_for_invalidation';
export type {
  QueueApiKeysForInvalidationDeps,
  QueuedApiKeyInvalidation,
  QueueApiKeyResult,
} from './invalidate/queue_api_keys_for_invalidation';
export { runInvalidate } from './invalidate/run_invalidate';
export type { RunInvalidateResult, SavedObjectTypesToQuery } from './invalidate/run_invalidate';
export type {
  ApiKeyInvalidationFn,
  ApiKeyPendingInvalidation,
  GetSOIdsUsedByRunningTasksFn,
  RunningTask,
  UiamApiKeyInvalidationFn,
} from './invalidate/types';
