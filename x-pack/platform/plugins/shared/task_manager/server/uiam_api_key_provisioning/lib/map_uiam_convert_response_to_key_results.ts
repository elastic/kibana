/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConvertUiamAPIKeysResponse } from '@kbn/core-security-server';
import type { ApiKeyToConvert, ConvertApiKeysResult, UiamKeyResult } from '../types';
import { createFailedConversionTaskProvisioningStatus } from './task_uiam_provisioning_observability_status';

/**
 * Maps the UIAM convert API response and input tasks into result rows and failed-conversion status docs.
 * Caller must ensure `convertResponse.results.length === apiKeysToConvert.length`.
 */
export const mapUiamConvertResponseToKeyResults = (
  apiKeysToConvert: ApiKeyToConvert[],
  convertResponse: ConvertUiamAPIKeysResponse
): ConvertApiKeysResult => {
  const converted: UiamKeyResult[] = [];
  const provisioningStatusForFailedConversions: ConvertApiKeysResult['provisioningStatusForFailedConversions'] =
    [];

  for (let i = 0; i < convertResponse.results.length && i < apiKeysToConvert.length; i++) {
    const item = convertResponse.results[i];
    const { taskId, attributes, version } = apiKeysToConvert[i];
    if (item.status === 'success') {
      converted.push({
        taskId,
        uiamApiKey: Buffer.from(`${item.id}:${item.key}`).toString('base64'),
        uiamApiKeyId: item.id,
        attributes,
        version,
      });
    } else if (item.status === 'failed') {
      provisioningStatusForFailedConversions.push(
        createFailedConversionTaskProvisioningStatus(
          taskId,
          `Error generating UIAM API key for the task with ID ${taskId}: ${item.message}`,
          item.code
        )
      );
    }
  }

  return {
    converted,
    provisioningStatusForFailedConversions,
  };
};
