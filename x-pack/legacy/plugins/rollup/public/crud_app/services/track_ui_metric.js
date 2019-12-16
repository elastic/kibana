/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  createUiStatsReporter,
  METRIC_TYPE,
} from '../../../../../../../src/legacy/core_plugins/ui_metric/public';
import { UIM_APP_NAME } from '../../../common';

export const trackUiMetric = createUiStatsReporter(UIM_APP_NAME);
export { METRIC_TYPE };

/**
 * Transparently return provided request Promise, while allowing us to track
 * a successful completion of the request.
 */
export function trackUserRequest(request, actionType) {
  // Only track successful actions.
  return request.then(response => {
    trackUiMetric(METRIC_TYPE.LOADED, actionType);
    // We return the response immediately without waiting for the tracking request to resolve,
    // to avoid adding additional latency.
    return response;
  });
}
