/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';

export function trackLegacyRouteUsage(route: string, usageCounter?: UsageCounter) {
  if (usageCounter) {
    usageCounter.incrementCounter({
      counterName: `legacyRoute_${route}`,
      counterType: 'legacyApiUsage',
      incrementBy: 1,
    });
  }
}
