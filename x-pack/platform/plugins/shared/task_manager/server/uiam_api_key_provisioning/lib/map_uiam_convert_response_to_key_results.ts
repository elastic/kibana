/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiKeyToConvert,
  UiamConvertFailedResult,
  UiamConvertResponse,
  UiamConvertSuccessResult,
  UiamKeyResult,
} from '../types';

export const mapUiamConvertResponseToKeyResults = (
  apiKeysToConvert: ApiKeyToConvert[],
  response: UiamConvertResponse,
  onItemFailed: (taskId: string, message: string) => void
): {
  converted: UiamKeyResult[];
  failedConversions: Array<{ taskId: string; message: string }>;
} => {
  const converted: UiamKeyResult[] = [];
  const failedConversions: Array<{ taskId: string; message: string }> = [];
  const limit = Math.min(response.results.length, apiKeysToConvert.length);

  for (let i = 0; i < limit; i++) {
    const item = response.results[i];
    const { taskId } = apiKeysToConvert[i];
    if (item.status === 'success') {
      const success = item as UiamConvertSuccessResult;
      const encodedKey = Buffer.from(`${success.id}:${success.key}`).toString('base64');
      converted.push({
        taskId,
        uiamApiKey: encodedKey,
        uiamApiKeyId: success.id,
      });
    } else {
      const failed = item as UiamConvertFailedResult;
      onItemFailed(taskId, failed.message);
      failedConversions.push({ taskId, message: failed.message });
    }
  }
  return { converted, failedConversions };
};
