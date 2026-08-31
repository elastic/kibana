/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvalidateAPIKeyResult } from '@kbn/core-security-server';
import { API_KEY_INVALIDATION_BATCH_SIZE } from '../../constants';
import { appContextService } from '../app_context';

export async function invalidateAPIKeys(ids: string[]): Promise<InvalidateAPIKeyResult | null> {
  const security = appContextService.getSecurity();
  if (!security) {
    throw new Error('Missing security plugin');
  }

  if (ids.length === 0) {
    return {
      invalidated_api_keys: [],
      previously_invalidated_api_keys: [],
      error_count: 0,
    };
  }

  const aggregated: InvalidateAPIKeyResult = {
    invalidated_api_keys: [],
    previously_invalidated_api_keys: [],
    error_count: 0,
  };
  const errorDetails: NonNullable<InvalidateAPIKeyResult['error_details']> = [];

  for (let start = 0; start < ids.length; start += API_KEY_INVALIDATION_BATCH_SIZE) {
    const batch = ids.slice(start, start + API_KEY_INVALIDATION_BATCH_SIZE);
    const res = await security.authc.apiKeys.invalidateAsInternalUser({
      ids: batch,
    });

    // A null response on the first chunk means Security is disabled/unavailable and zero keys were invalidated.
    // A null response on a later chunk means earlier chunks succeeded and invalidated real keys; return the partial
    // aggregated result so far. Remaining untried IDs are not reflected in the result (neither as invalidated nor as errored)
    // and callers should treat any ID not present in invalidated_api_keys/previously_invalidated_api_keys as unresolved.
    if (!res) {
      if (start === 0) {
        return null;
      }
      break;
    }

    aggregated.invalidated_api_keys.push(...(res.invalidated_api_keys ?? []));
    aggregated.previously_invalidated_api_keys.push(...(res.previously_invalidated_api_keys ?? []));
    aggregated.error_count += res.error_count ?? 0;
    if (res.error_details && res.error_details.length > 0) {
      errorDetails.push(...res.error_details);
    }
  }

  if (aggregated.error_count > 0 && errorDetails.length > 0) {
    aggregated.error_details = errorDetails;
  }

  return aggregated;
}
