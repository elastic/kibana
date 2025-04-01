/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventsQueries } from '../../../../../common/api/search_strategy';

import { TimelineFactory } from '../types';
import { timelineEventsAll } from './all';
import { timelineEventsDetails } from './details';
import { timelineKpi } from './kpi';
import { timelineEventsLastEventTime } from './last_event_time';

export const timelineEventsFactory: {
  [K in TimelineEventsQueries]: TimelineFactory<K>;
} = {
  [TimelineEventsQueries.all]: timelineEventsAll,
  [TimelineEventsQueries.details]: timelineEventsDetails,
  [TimelineEventsQueries.kpi]: timelineKpi,
  [TimelineEventsQueries.lastEventTime]: timelineEventsLastEventTime,
};
