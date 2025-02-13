/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompleteRetryConfiguration } from '@kbn/inference-common';

const retryAll = () => true;

const retryRecoverable = (err: any) => {
  // TODO
  return true;
};

export const getRetryFilter = (
  retryOn: ChatCompleteRetryConfiguration['retryOn'] = 'auto'
): ((err: any) => boolean) => {
  if (typeof retryOn === 'function') {
    return retryOn;
  }
  if (retryOn === 'all') {
    return retryAll;
  }
  return retryRecoverable;
};
