/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';

export function hasCapabilities(coreStart: CoreStart) {
  const { canUseAiops } = coreStart.application.capabilities.ml;
  const aiopsEnabled = coreStart.application.capabilities.aiops.enabled;
  return canUseAiops && aiopsEnabled;
}
