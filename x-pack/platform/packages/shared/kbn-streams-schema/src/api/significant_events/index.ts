/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { ServerSentEventBase } from '@kbn/sse-utils';
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

type ChangePointsValue = Partial<{
  p_value: number;
  r_value: number;
  change_point: number;
  trend: string;
}>;

type SignificantEventsResponse = StreamQueryKql & {
  occurrences: Array<{ date: string; count: number }>;
  change_points: {
    type: Partial<Record<ChangePointsType, ChangePointsValue>>;
  };
};

type SignificantEventsGetResponse = SignificantEventsResponse[];

type SignificantEventsPreviewResponse = Pick<
  SignificantEventsResponse,
  'occurrences' | 'change_points' | 'kql'
>;

interface GeneratedSignificantEventQuery {
  title: string;
  kql: string;
}

type SignificantEventsGenerateResponse = Observable<
  ServerSentEventBase<'generated_queries', { query: GeneratedSignificantEventQuery }>
>;

export type {
  SignificantEventsResponse,
  SignificantEventsGetResponse,
  SignificantEventsPreviewResponse,
  GeneratedSignificantEventQuery,
  SignificantEventsGenerateResponse,
};
