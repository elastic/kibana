/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { withSpan } from '@kbn/apm-utils';
import { generateAPIKeyName, resolveRuleAPIKey, shouldGrantRuleApiKey } from '../common';
import type { RuleApiKeyOwnership } from '../common';
import { API_KEY_GENERATE_CONCURRENCY } from '../common/constants';
import type { CreateAPIKeyResult, RulesClientContext } from '../types';

export interface GrantBulkItem {
  id: string;
  typeId: string;
  name: string;
  enabled: boolean;
  apiKeyOwnership?: RuleApiKeyOwnership;
}

export interface GrantedKey {
  result: CreateAPIKeyResult;
  createdByUser: boolean;
}

export interface GrantBulkResult {
  granted: Map<string, GrantedKey>;
  failures: Map<string, Error>;
}

/**
 * Resolves API keys for a batch. Grant-path items use one `_bulk_grant` call
 * when `createAPIKeys` is wired; clone, reuse, and per-rule fallback go
 * through `resolveRuleAPIKey`. Failed items are omitted (caller treats
 * enabled + missing as an error).
 */
export const grantBulkApiKeys = async (
  context: RulesClientContext,
  items: GrantBulkItem[]
): Promise<GrantBulkResult> => {
  const granted = new Map<string, GrantedKey>();
  const failures = new Map<string, Error>();
  const createAPIKeys = context.createAPIKeys;
  const toGrant = items.filter((item) =>
    shouldGrantRuleApiKey(context, item.enabled, item.apiKeyOwnership)
  );

  if (createAPIKeys && toGrant.length > 0) {
    try {
      const results = await withSpan({ name: 'createAPIKeys', type: 'rules' }, () =>
        createAPIKeys(toGrant.map((item) => generateAPIKeyName(item.typeId, item.name)))
      );
      toGrant.forEach((item, i) => {
        if (results[i]) {
          granted.set(item.id, { result: results[i], createdByUser: false });
        }
      });
    } catch (err) {
      context.logger.debug(
        `bulk API key grant failed, falling back to per-rule generation: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  const remaining = items.filter((item) => item.enabled && !granted.has(item.id));
  if (remaining.length === 0) {
    return { granted, failures };
  }

  await pMap(
    remaining,
    async (item) => {
      try {
        const resolved = await resolveRuleAPIKey(
          context,
          generateAPIKeyName(item.typeId, item.name),
          true,
          item.apiKeyOwnership
        );
        if (resolved.createdAPIKey) {
          granted.set(item.id, {
            result: resolved.createdAPIKey,
            createdByUser: resolved.isAuthTypeApiKey,
          });
        }
      } catch (err) {
        failures.set(item.id, err instanceof Error ? err : new Error(String(err)));
      }
    },
    { concurrency: API_KEY_GENERATE_CONCURRENCY }
  );

  return { granted, failures };
};
