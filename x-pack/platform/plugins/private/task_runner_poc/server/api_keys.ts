/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreAuthenticationService, KibanaRequest } from '@kbn/core/server';

type ApiKeys = CoreAuthenticationService['apiKeys'];

/** Index privileges a task needs; matches task-runner/scripts/api-key.sh. */
const TASK_ROLE_DESCRIPTORS = {
  task: {
    indices: [
      { names: ['logs-*'], privileges: ['read', 'view_index_metadata'] },
      { names: ['tr-*'], privileges: ['read', 'write', 'view_index_metadata'] },
    ],
  },
};

export interface GrantTaskApiKeyOptions {
  name: string;
  /** Elasticsearch duration such as `1h`. Omit for a key that never expires. */
  expiration?: string;
  metadata?: Record<string, string>;
}

export interface TaskApiKey {
  id: string;
  /** base64(id:api_key), the form the service expects. */
  encoded: string;
}

export class ApiKeysDisabledError extends Error {
  constructor() {
    super('API keys are disabled in Elasticsearch');
    this.name = 'ApiKeysDisabledError';
  }
}

/** Grants an API key on behalf of the request's user, limited to what a task needs. */
export const grantTaskApiKey = async (
  apiKeys: ApiKeys,
  request: KibanaRequest,
  { name, expiration, metadata }: GrantTaskApiKeyOptions
): Promise<TaskApiKey> => {
  const result = await apiKeys.grantAsInternalUser(request, {
    name,
    ...(expiration ? { expiration } : {}),
    role_descriptors: TASK_ROLE_DESCRIPTORS,
    metadata: { application: 'task_runner_poc', ...metadata },
  });
  if (!result) {
    throw new ApiKeysDisabledError();
  }
  return {
    id: result.id,
    encoded: Buffer.from(`${result.id}:${result.api_key}`).toString('base64'),
  };
};
