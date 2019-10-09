/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { UIM_APP_NAME } from '../../../common';

npSetup.plugins.metrics.registerApp(UIM_APP_NAME);
export const METRIC_TYPE = npStart.plugins.metrics.METRIC_TYPE;
export const trackUiMetric = npStart.plugins.metrics.reportUiStats.bind(null, UIM_APP_NAME);

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
