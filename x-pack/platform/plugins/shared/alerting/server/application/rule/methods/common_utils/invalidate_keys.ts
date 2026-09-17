/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import type { RulesClientContext } from '../../../../rules_client/types';

export interface ApiKeyEntry {
  apiKey: string | null;
  uiamApiKey: string | null;
  apiKeyCreatedByUser: boolean | null;
}

export const invalidateKeys = async (
  entries: Iterable<ApiKeyEntry>,
  context: RulesClientContext
): Promise<void> => {
  const keys: string[] = [];
  for (const { apiKey, uiamApiKey, apiKeyCreatedByUser } of entries) {
    if (apiKey && !apiKeyCreatedByUser) keys.push(apiKey);
    if (uiamApiKey && !apiKeyCreatedByUser) keys.push(uiamApiKey);
  }
  if (keys.length === 0) return;
  // Writes pending-invalidation SOs; logs errors internally, never throws.
  await bulkMarkApiKeysForInvalidation(
    { apiKeys: [...new Set(keys)] },
    context.logger,
    context.unsecuredSavedObjectsClient
  );
};
