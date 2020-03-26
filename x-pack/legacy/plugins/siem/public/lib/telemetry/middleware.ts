/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, Dispatch, MiddlewareAPI } from 'redux';

import { track, METRIC_TYPE, TELEMETRY_EVENT } from './';
import { timelineActions } from '../../store/actions';

export const telemetryMiddleware = (api: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
  if (timelineActions.endTimelineSaving.match(action)) {
    track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.TIMELINE_SAVED);
  } else if (timelineActions.updateTitle.match(action)) {
    track(METRIC_TYPE.COUNT, TELEMETRY_EVENT.TIMELINE_NAMED);
  } else if (timelineActions.showTimeline.match(action)) {
    if (action.payload.show) {
      track(METRIC_TYPE.LOADED, TELEMETRY_EVENT.TIMELINE_OPENED);
    }
  }

  return next(action);
};
