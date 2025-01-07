/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';

export function trackLegacyRBACExemption(
  source: string,
  usageCounter?: UsageCounter,
  increment?: number
) {
  if (usageCounter) {
    usageCounter.incrementCounter({
      counterName: `source_${source}`,
      counterType: 'legacyRBACExemption',
      incrementBy: increment ? increment : 1,
    });
  }
}
