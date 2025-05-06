/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamQueryKql } from '../../queries';

/**
 * SignificantEvents Get Response
 */
type ChangePointsType =
  | 'dip'
  | 'distribution_change'
  | 'non_stationary'
  | 'spike'
  | 'stationary'
  | 'step_change'
  | 'trend_change';

type SignificantEventsResponse = StreamQueryKql & {
  occurrences: Array<{ date: string; count: number }>;
  change_points: {
    type: Partial<Record<ChangePointsType, { p_value: number; change_point: number }>>;
  };
};

type SignificantEventsGetResponse = SignificantEventsResponse[];

type SignificantEventsPreviewResponse = SignificantEventsResponse;

export type {
  SignificantEventsResponse,
  SignificantEventsGetResponse,
  SignificantEventsPreviewResponse,
};
