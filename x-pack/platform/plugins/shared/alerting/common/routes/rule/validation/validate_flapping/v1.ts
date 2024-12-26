/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MIN_LOOK_BACK_WINDOW as MIN_LOOK_BACK_WINDOW_V1,
  MAX_LOOK_BACK_WINDOW as MAX_LOOK_BACK_WINDOW_V1,
  MIN_STATUS_CHANGE_THRESHOLD as MIN_STATUS_CHANGE_THRESHOLD_V1,
  MAX_STATUS_CHANGE_THRESHOLD as MAX_STATUS_CHANGE_THRESHOLD_V1,
} from '@kbn/alerting-types/flapping/v1';

export const validateFlapping = (flapping: {
  look_back_window: number;
  status_change_threshold: number;
}) => {
  const { look_back_window: lookBackWindow, status_change_threshold: statusChangeThreshold } =
    flapping;

  if (lookBackWindow < MIN_LOOK_BACK_WINDOW_V1 || lookBackWindow > MAX_LOOK_BACK_WINDOW_V1) {
    return `look back window must be between ${MIN_LOOK_BACK_WINDOW_V1} and ${MAX_LOOK_BACK_WINDOW_V1}`;
  }

  if (
    statusChangeThreshold < MIN_STATUS_CHANGE_THRESHOLD_V1 ||
    statusChangeThreshold > MAX_STATUS_CHANGE_THRESHOLD_V1
  ) {
    return `status change threshold must be between ${MIN_STATUS_CHANGE_THRESHOLD_V1} and ${MAX_STATUS_CHANGE_THRESHOLD_V1}`;
  }

  if (lookBackWindow < statusChangeThreshold) {
    return `lookBackWindow (${lookBackWindow}) must be equal to or greater than statusChangeThreshold (${statusChangeThreshold})`;
  }
};
