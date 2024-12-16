/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiCounterMetricType, METRIC_TYPE } from '@kbn/analytics';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { UIM_APP_NAME } from '../constants';

export { METRIC_TYPE };

export let usageCollection: UsageCollectionSetup | undefined;

export function init(_usageCollection: UsageCollectionSetup): void {
  usageCollection = _usageCollection;
}

export function trackUiMetric(metricType: UiCounterMetricType, name: string) {
  if (!usageCollection) {
    return;
  }
  const { reportUiCounter } = usageCollection;
  reportUiCounter(UIM_APP_NAME, metricType, name);
}

/**
 * Transparently return provided request Promise, while allowing us to track
 * a successful completion of the request.
 */
export function trackUserRequest(request: Promise<any>, eventName: string) {
  // Only track successful actions.
  return request.then((response: any) => {
    trackUiMetric(METRIC_TYPE.COUNT, eventName);
    // We return the response immediately without waiting for the tracking request to resolve,
    // to avoid adding additional latency.
    return response;
  });
}
