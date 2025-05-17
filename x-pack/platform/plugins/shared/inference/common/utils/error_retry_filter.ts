/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ChatCompleteRetryConfiguration,
  isInferenceProviderError,
  isToolValidationError,
} from '@kbn/inference-common';

const STATUS_NO_RETRY = [
  400, // Bad Request
  401, // Unauthorized
  402, // Payment Required
  403, // Forbidden
  404, // Not Found
  405, // Method Not Allowed
  406, // Not Acceptable
  407, // Proxy Authentication Required
  409, // Conflict
];

const retryAll = () => true;

const isRecoverable = (err: any) => {
  // tool validation error are from malformed json or generation not matching the schema
  if (isToolValidationError(err)) {
    return true;
  }
  if (isInferenceProviderError(err)) {
    const status = err.status;
    if (status && STATUS_NO_RETRY.includes(status)) {
      return false;
    }
    return true;
  }

  return false;
};

export const getRetryFilter = (
  retryOn: ChatCompleteRetryConfiguration['retryOn'] = 'auto'
): ((err: Error) => boolean) => {
  if (typeof retryOn === 'function') {
    return retryOn;
  }
  if (retryOn === 'all') {
    return retryAll;
  }
  return isRecoverable;
};
