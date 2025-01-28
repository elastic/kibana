/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Contains values for ML time series explorer.
 */

export const APP_STATE_ACTION = {
  CLEAR: 'CLEAR',
  SET_DETECTOR_INDEX: 'SET_DETECTOR_INDEX',
  SET_ENTITIES: 'SET_ENTITIES',
  SET_FORECAST_ID: 'SET_FORECAST_ID',
  SET_ZOOM: 'SET_ZOOM',
  UNSET_ZOOM: 'UNSET_ZOOM',
  SET_FUNCTION_DESCRIPTION: 'SET_FUNCTION_DESCRIPTION',
} as const;

export type TimeseriesexplorerActionType = (typeof APP_STATE_ACTION)[keyof typeof APP_STATE_ACTION];

export const CHARTS_POINT_TARGET = 500;

// Max number of scheduled events displayed per bucket.
export const MAX_SCHEDULED_EVENTS = 10;

export const TIME_FIELD_NAME = 'timestamp';
