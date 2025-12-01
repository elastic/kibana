/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STREAMS_TOUR_CALLOUT_DISMISSED_KEY = 'streams.tour.calloutDismissed';

export enum StreamsTourStep {
  STREAMS_LIST = 1,
  RETENTION = 2,
  PROCESSING = 3,
  ADVANCED = 4,
}

export const TOUR_STEPS_TOTAL = 4;
