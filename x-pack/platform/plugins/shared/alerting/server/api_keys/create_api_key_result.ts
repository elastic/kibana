/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrantAPIKeyResult } from '@kbn/core-security-server';
import type { ApiKeys, CreateOptions } from '@kbn/response-ops-api-keys';
import { decodeApiKey, encodeApiKey } from '@kbn/response-ops-api-keys';
import type { CreateAPIKeyResult } from '../rules_client/types';

/** Records the keys the security service creates, which the rules client returns as-is. */
export const recordCreatedKeys = (): Required<Pick<CreateOptions, 'onKeyCreated'>> & {
  toResult: (keys: ApiKeys | null) => CreateAPIKeyResult;
} => {
  const created: { es?: GrantAPIKeyResult; uiam?: GrantAPIKeyResult } = {};
  return {
    onKeyCreated: (type, key) => {
      created[type] = key;
    },
    toResult: (keys) =>
      keys
        ? {
            apiKeysEnabled: true,
            ...(created.es ? { result: created.es } : {}),
            ...(created.uiam ? { uiamResult: created.uiam } : {}),
          }
        : { apiKeysEnabled: false },
  };
};

/** The rules client's view of the caller's own API key. */
export const toReusedAPIKeyResult = (keys: ApiKeys, name: string): CreateAPIKeyResult => {
  const { es, uiam } = keys;
  return {
    apiKeysEnabled: true,
    ...(es ? { result: { id: es.id, name, api_key: decodeApiKey(es.encoded).secret ?? '' } } : {}),
    ...(uiam
      ? {
          uiamResult: {
            ...(uiam.id ? { id: uiam.id } : {}),
            name: `uiam-${name}`,
            api_key: uiam.secret,
            ...(uiam.external ? { external: true } : {}),
          },
        }
      : {}),
  };
};

/** The keys to store on a rule. Keys without an id are only kept when they are the user's own. */
export const toRuleApiKeys = (
  created: CreateAPIKeyResult,
  createdByUser: boolean
): ApiKeys | undefined => {
  if (!created.apiKeysEnabled) {
    return undefined;
  }
  const { result, uiamResult } = created;
  return {
    createdByUser,
    ...(result?.id && result.api_key
      ? { es: { id: result.id, encoded: encodeApiKey(result.id, result.api_key) } }
      : {}),
    ...(uiamResult?.api_key && (uiamResult.id || createdByUser)
      ? {
          uiam: {
            ...(uiamResult.id ? { id: uiamResult.id } : {}),
            secret: uiamResult.api_key,
            external: uiamResult.external === true,
          },
        }
      : {}),
  };
};
