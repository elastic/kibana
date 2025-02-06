/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  TimelineEventsAllStrategyResponse,
  TimelineEventsDetailsStrategyResponse,
  TimelineEventsLastEventTimeStrategyResponse,
  TimelineKpiStrategyResponse,
} from './events';
import { SortField } from '../common';
import {
  TimelineEventsAllOptionsInput,
  TimelineEventsDetailsRequestOptionsInput,
  TimelineEventsLastEventTimeRequestOptionsInput,
  TimelineEventsQueries,
  TimelineKpiRequestOptionsInput,
} from '../../api/search_strategy';

export * from './events';

export type TimelineFactoryQueryTypes = TimelineEventsQueries;

export interface TimelineRequestSortField<Field = string> extends SortField<Field> {
  esTypes: string[];
  type: string;
}

export type TimelineStrategyResponseType<T extends TimelineFactoryQueryTypes> =
  T extends TimelineEventsQueries.all
    ? TimelineEventsAllStrategyResponse
    : T extends TimelineEventsQueries.details
    ? TimelineEventsDetailsStrategyResponse
    : T extends TimelineEventsQueries.kpi
    ? TimelineKpiStrategyResponse
    : T extends TimelineEventsQueries.lastEventTime
    ? TimelineEventsLastEventTimeStrategyResponse
    : never;

export type TimelineStrategyRequestType<T extends TimelineFactoryQueryTypes> =
  T extends TimelineEventsQueries.all
    ? TimelineEventsAllOptionsInput
    : T extends TimelineEventsQueries.details
    ? TimelineEventsDetailsRequestOptionsInput
    : T extends TimelineEventsQueries.kpi
    ? TimelineKpiRequestOptionsInput
    : T extends TimelineEventsQueries.lastEventTime
    ? TimelineEventsLastEventTimeRequestOptionsInput
    : never;
