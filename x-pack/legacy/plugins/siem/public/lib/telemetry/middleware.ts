/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, Dispatch, MiddlewareAPI } from 'redux';

import { track, METRIC_TYPE, TELEMETRY_EVENT } from './';
import { timelineActions } from '../../store/actions';

export const telemetryMiddleware = (api: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
  if (action.type === timelineActions.endTimelineSaving.type) {
    track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.TIMELINE_SAVED);
  }

  return next(action);
};
