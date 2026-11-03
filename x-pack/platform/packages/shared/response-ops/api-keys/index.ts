/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ApiKeysClient } from './src/client';
export type { ApiKeysClientOptions } from './src/client';
export type { ApiKeys, CreateOptions, RequestApiKey } from './src/create';
export { UiamUnavailableError } from './src/errors';

export {
  decodeApiKey,
  encodeApiKey,
  getInvalidationTargets,
  getUiamApiKeyId,
  getUiamApiKeySecret,
} from './src/stored_keys';
export type { InvalidationTarget, StoredApiKeys } from './src/stored_keys';

export { toFakeRequest } from './src/fake_request';
export type { CredentialType, FakeRequestResult } from './src/fake_request';

export { queueInvalidationTargets } from './src/queue';
export type { QueueResult } from './src/queue';

export { runInvalidate } from './src/task/run_invalidate';
export type { RunInvalidateResult } from './src/task/run_invalidate';
export type {
  ApiKeyInvalidationFn,
  GetIdsUsedByRunningTasks,
  PendingApiKeyInvalidation,
  RunningTask,
  SavedObjectTypesToQuery,
  UiamApiKeyInvalidationFn,
} from './src/task/types';
export { apiKeyInvalidationTaskConfigSchema } from './src/task/config_schema';
export {
  apiKeyInvalidationTaskStateSchemaByVersion,
  emptyApiKeyInvalidationTaskState,
} from './src/task/state_schema';
export type { ApiKeyInvalidationTaskState } from './src/task/state_schema';
