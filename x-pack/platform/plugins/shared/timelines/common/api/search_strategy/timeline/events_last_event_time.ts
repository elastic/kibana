/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { TimelineEventsQueries } from '../model/timeline_events_queries';
import { timelineRequestBasicOptionsSchema } from './request_basic';

export enum LastEventIndexKey {
  hostDetails = 'hostDetails',
  hosts = 'hosts',
  users = 'users',
  userDetails = 'userDetails',
  ipDetails = 'ipDetails',
  network = 'network',
}

export const timelineEventsLastEventTimeRequestSchema = timelineRequestBasicOptionsSchema
  .omit({
    runtimeMappings: true,
    filterQuery: true,
    timerange: true,
  })
  .extend({
    indexKey: z.enum([
      LastEventIndexKey.hostDetails,
      LastEventIndexKey.hosts,
      LastEventIndexKey.users,
      LastEventIndexKey.userDetails,
      LastEventIndexKey.ipDetails,
      LastEventIndexKey.network,
    ]),
    details: z.object({
      hostName: z.string().nullable().optional(),
      userName: z.string().nullable().optional(),
      ip: z.string().nullable().optional(),
    }),
    factoryQueryType: z.literal(TimelineEventsQueries.lastEventTime),
  });

export type TimelineEventsLastEventTimeRequestOptionsInput = z.input<
  typeof timelineEventsLastEventTimeRequestSchema
>;

export type TimelineEventsLastEventTimeRequestOptions = z.infer<
  typeof timelineEventsLastEventTimeRequestSchema
>;
