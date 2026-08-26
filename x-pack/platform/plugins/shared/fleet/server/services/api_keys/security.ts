/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
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

  const idBatches = chunk(ids, API_KEY_INVALIDATION_BATCH_SIZE);
  const aggregated: InvalidateAPIKeyResult = {
    invalidated_api_keys: [],
    previously_invalidated_api_keys: [],
    error_count: 0,
  };
  const errorDetails: NonNullable<InvalidateAPIKeyResult['error_details']> = [];

  for (const batch of idBatches) {
    const res = await security.authc.apiKeys.invalidateAsInternalUser({
      ids: batch,
    });

    if (res) {
      aggregated.invalidated_api_keys.push(...(res.invalidated_api_keys ?? []));
      aggregated.previously_invalidated_api_keys.push(
        ...(res.previously_invalidated_api_keys ?? [])
      );
      aggregated.error_count += res.error_count ?? 0;
      if (res.error_details && res.error_details.length > 0) {
        errorDetails.push(...res.error_details);
      }
    }
  }

  if (aggregated.error_count > 0 && errorDetails.length > 0) {
    aggregated.error_details = errorDetails;
  }

  return aggregated;
}
