/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConvertUiamAPIKeysResponse } from '@kbn/core-security-server';
import type { ApiKeyToConvert, ConvertApiKeysResult, UiamApiKeyByRuleId } from '../types';
import { createFailedConversionStatus } from './provisioning_status';

/**
 * Maps the UIAM convert API response and input rules into a result map and failed-conversion status docs.
 * Caller must ensure convertResponse.results.length === apiKeysToConvert.length.
 */
export const mapConvertResponseToResult = (
  apiKeysToConvert: Array<ApiKeyToConvert>,
  convertResponse: ConvertUiamAPIKeysResponse
): ConvertApiKeysResult => {
  const rulesWithUiamApiKeys = new Map<string, UiamApiKeyByRuleId>();
  const provisioningStatusForFailedConversions: ConvertApiKeysResult['provisioningStatusForFailedConversions'] =
    [];

  for (let i = 0; i < convertResponse.results.length && i < apiKeysToConvert.length; i++) {
    const item = convertResponse.results[i];
    const { ruleId, attributes, version, namespace } = apiKeysToConvert[i];
    if (item.status === 'success') {
      rulesWithUiamApiKeys.set(ruleId, {
        ruleId,
        uiamApiKey: Buffer.from(`${item.id}:${item.key}`).toString('base64'),
        attributes,
        version,
        namespace,
      });
    } else if (item.status === 'failed') {
      provisioningStatusForFailedConversions.push(
        createFailedConversionStatus(
          ruleId,
          `Error generating UIAM API key for the rule with ID ${ruleId}: ${item.message}`,
          item.code
        )
      );
    }
  }

  return {
    rulesWithUiamApiKeys,
    provisioningStatusForFailedConversions,
  };
};
