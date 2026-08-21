/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';

export const canUseAiops = (coreStart: CoreStart, throwError = false) => {
  const canUse =
    coreStart.application.capabilities.ml.canUseAiops === true &&
    coreStart.application.capabilities.aiops.enabled === true;
  if (throwError && !canUse) {
    throw new Error('AIOps is not enabled');
  }
  return canUse;
};
