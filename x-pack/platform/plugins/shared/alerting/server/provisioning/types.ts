/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../saved_objects';

export interface ProvisioningStatusDocs {
  type: typeof UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE;
  id: string;
  attributes: {
    '@timestamp': string;
    entityId: string;
    entityType: string;
    status: string;
    message?: string;
  };
}

export interface ApiKeyToConvert {
  ruleId: string;
  apiKey: string;
}

export interface UiamApiKeyByRuleId {
  ruleId: string;
  uiamApiKey: string;
}

export interface GetApiKeysToConvertResult {
  apiKeysToConvert: Array<ApiKeyToConvert>;
  provisioningStatusForSkippedRules: Array<ProvisioningStatusDocs>;
  hasMoreToUpdate: boolean;
}

export interface ConvertApiKeysResult {
  apiKeysByRuleId: Array<UiamApiKeyByRuleId>;
  provisioningStatusForFailedConversions: Array<ProvisioningStatusDocs>;
}
