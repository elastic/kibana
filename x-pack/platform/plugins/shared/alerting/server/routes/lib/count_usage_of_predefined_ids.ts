/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';

export interface CountUsageOfPredefinedIdsOptions {
  predefinedId?: string;
  spaceId?: string;
  usageCounter?: UsageCounter;
}

export function countUsageOfPredefinedIds({
  predefinedId,
  spaceId,
  usageCounter,
}: CountUsageOfPredefinedIdsOptions) {
  if (predefinedId && usageCounter) {
    // Track any usage of pre-defined ID
    usageCounter?.incrementCounter({
      counterName: 'ruleCreatedWithPredefinedId',
      incrementBy: 1,
    });

    const isInCustomSpace = spaceId !== undefined && spaceId !== 'default';
    if (isInCustomSpace) {
      // Track usage of pre-defined ID in custom space
      usageCounter?.incrementCounter({
        counterName: 'ruleCreatedWithPredefinedIdInCustomSpace',
        incrementBy: 1,
      });
    }
  }
}
