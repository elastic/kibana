/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ApiKeysClient } from './src/client';
export { CloudApiKeyNotSupportedError, UiamUnavailableError } from './src/errors';
export { getUiamLogTags } from './src/log_tags';
export type { UiamLogTags } from './src/log_tags';

export { chooseApiKeySource } from './src/create/choose_source';
export type { ApiKeySource } from './src/create/choose_source';
export type { ApiKeysProfile, CreateOptions, ResolveOptions, UiamMode } from './src/create/types';

export {
  decodeApiKey,
  encodeApiKey,
  encodeUiamApiKey,
  getUiamApiKeyId,
  getUiamApiKeySecret,
  toEsApiKey,
  toUiamApiKey,
} from './src/store/api_keys';
export type { ApiKeys, EsApiKey, UiamApiKey } from './src/store/api_keys';
export { defineApiKeyStorage } from './src/store/define_storage';
export type { ApiKeyStorage } from './src/store/define_storage';

export { buildFakeRequest, pickCredential, toFakeRequest } from './src/use/fake_request';
export type { PickedCredential } from './src/use/fake_request';

export { getInvalidationTargets } from './src/invalidate/targets';
export type { InvalidationTarget } from './src/invalidate/targets';
export { queueInvalidationTargets } from './src/invalidate/queue';
export type { QueueResult } from './src/invalidate/queue';
export { runInvalidate } from './src/invalidate/task/run_invalidate';
export { createInvalidationRunner } from './src/invalidate/task/create_invalidation_runner';
export type { InvalidationRunner } from './src/invalidate/task/create_invalidation_runner';
export type {
  ApiKeyInvalidationFn,
  PendingApiKeyInvalidation,
  RunningTask,
  UiamApiKeyInvalidationFn,
} from './src/invalidate/task/types';
export {
  apiKeyInvalidationTaskStateSchemaByVersion,
  emptyApiKeyInvalidationTaskState,
} from './src/invalidate/task/state_schema';
export type { ApiKeyInvalidationTaskState } from './src/invalidate/task/state_schema';
