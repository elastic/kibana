/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineApiKeyStorage, toEsApiKey, toUiamApiKey } from '@kbn/response-ops-api-keys';
import type { TaskUserScope } from '../task';

export interface TaskApiKeyAttributes {
  /** `base64(id:secret)` Elasticsearch API key. */
  apiKey?: string;
  /** Raw `essu_` UIAM secret, or `base64(id:essu_…)` from the UIAM provisioning path. */
  uiamApiKey?: string;
  userScope?: Pick<
    TaskUserScope,
    'apiKeyId' | 'uiamApiKeyId' | 'apiKeyCreatedByUser' | 'uiamApiKeyExternal'
  >;
}

/**
 * How a task stores its API keys. `userScope.apiKeyId` holds the UIAM key id when the task has
 * no ES key, so the invalidation task's in-use query still finds it. User-created keys have no
 * id and store an empty `apiKeyId`, which the task schema requires.
 */
export const taskApiKeyStorage = defineApiKeyStorage<TaskApiKeyAttributes>({
  write: ({ createdByUser, es, uiam }) => ({
    ...(es ? { apiKey: es.encoded } : {}),
    ...(uiam ? { uiamApiKey: uiam.secret } : {}),
    userScope: {
      apiKeyId: es?.id ?? uiam?.id ?? '',
      ...(uiam?.id ? { uiamApiKeyId: uiam.id } : {}),
      apiKeyCreatedByUser: createdByUser,
      ...(createdByUser && uiam?.external ? { uiamApiKeyExternal: true } : {}),
    },
  }),
  read: ({ apiKey, uiamApiKey, userScope }) => {
    if (!apiKey && !uiamApiKey) {
      return undefined;
    }
    return {
      createdByUser: userScope?.apiKeyCreatedByUser === true,
      ...(apiKey ? { es: toEsApiKey(apiKey, userScope?.apiKeyId) } : {}),
      ...(uiamApiKey
        ? {
            uiam: toUiamApiKey(uiamApiKey, {
              id: userScope?.uiamApiKeyId,
              external: userScope?.uiamApiKeyExternal,
            }),
          }
        : {}),
    };
  },
});
