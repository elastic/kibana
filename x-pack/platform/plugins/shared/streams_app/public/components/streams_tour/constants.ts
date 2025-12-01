/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STREAMS_TOUR_CALLOUT_DISMISSED_KEY = 'streams.tour.calloutDismissed';

export type StreamsTourStepId =
  | 'streams_list'
  | 'retention'
  | 'processing'
  | 'attachments'
  | 'advanced';

export const STEP_ID_TO_TAB: Record<StreamsTourStepId, string | undefined> = {
  streams_list: undefined,
  retention: 'retention',
  processing: 'processing',
  attachments: 'attachments',
  advanced: 'advanced',
};
