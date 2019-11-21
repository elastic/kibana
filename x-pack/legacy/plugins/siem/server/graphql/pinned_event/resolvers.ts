/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppResolverOf } from '../../lib/framework';
import { MutationResolvers, QueryResolvers } from '../types';
import { PinnedEvent } from '../../lib/pinned_event/saved_object';

export type QueryAllPinnedEventsByTimelineIdResolver = AppResolverOf<
  QueryResolvers.GetAllPinnedEventsByTimelineIdResolver
>;

export type MutationPinnedEventResolver = AppResolverOf<
  MutationResolvers.PersistPinnedEventOnTimelineResolver
>;

export type MutationDeletePinnedEventOnTimelineResolver = AppResolverOf<
  MutationResolvers.DeletePinnedEventOnTimelineResolver
>;

export type MutationDeleteAllPinnedEventsOnTimelineResolver = AppResolverOf<
  MutationResolvers.DeleteAllPinnedEventsOnTimelineResolver
>;

interface TimelineResolversDeps {
  pinnedEvent: PinnedEvent;
}

export const createPinnedEventResolvers = (
  libs: TimelineResolversDeps
): {
  Query: {
    getAllPinnedEventsByTimelineId: QueryAllPinnedEventsByTimelineIdResolver;
  };
  Mutation: {
    persistPinnedEventOnTimeline: MutationPinnedEventResolver;
    deletePinnedEventOnTimeline: MutationDeletePinnedEventOnTimelineResolver;
    deleteAllPinnedEventsOnTimeline: MutationDeleteAllPinnedEventsOnTimelineResolver;
  };
} => ({
  Query: {
    async getAllPinnedEventsByTimelineId(root, args, { req }) {
      return libs.pinnedEvent.getAllPinnedEventsByTimelineId(req, args.timelineId);
    },
  },
  Mutation: {
    async persistPinnedEventOnTimeline(root, args, { req }) {
      return libs.pinnedEvent.persistPinnedEventOnTimeline(
        req,
        args.pinnedEventId || null,
        args.eventId,
        args.timelineId || null
      );
    },
    async deletePinnedEventOnTimeline(root, args, { req }) {
      await libs.pinnedEvent.deletePinnedEventOnTimeline(req, args.id);
      return true;
    },
    async deleteAllPinnedEventsOnTimeline(root, args, { req }) {
      await libs.pinnedEvent.deleteAllPinnedEventsOnTimeline(req, args.timelineId);
      return true;
    },
  },
});
