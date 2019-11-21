/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UIM_APP_NAME } from '../constants';
import {
  createUiStatsReporter,
  METRIC_TYPE,
} from '../../../../../../../src/legacy/core_plugins/ui_metric/public';

export let trackUiMetric: ReturnType<typeof createUiStatsReporter>;
export { METRIC_TYPE };

export function init(getReporter: typeof createUiStatsReporter): void {
  trackUiMetric = getReporter(UIM_APP_NAME);
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
