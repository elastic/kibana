/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MutationResolvers, QueryResolvers } from '../types';
import { Timeline } from '../../lib/timeline/saved_object';

interface TimelineResolversDeps {
  timeline: Timeline;
}

export const createTimelineResolvers = (
  libs: TimelineResolversDeps
): {
  Query: {
    getOneTimeline: QueryResolvers['getOneTimeline'];
    getAllTimeline: QueryResolvers['getAllTimeline'];
  };
  Mutation: {
    deleteTimeline: MutationResolvers['deleteTimeline'];
    persistTimeline: MutationResolvers['persistTimeline'];
    persistFavorite: MutationResolvers['persistFavorite'];
  };
} => ({
  Query: {
    async getOneTimeline(root, args, { req }) {
      return libs.timeline.getTimeline(req, args.id);
    },
    async getAllTimeline(root, args, { req }) {
      return libs.timeline.getAllTimeline(
        req,
        args.onlyUserFavorite || null,
        args.pageInfo || null,
        args.search || null,
        args.sort || null
      );
    },
  },
  Mutation: {
    async deleteTimeline(root, args, { req }) {
      await libs.timeline.deleteTimeline(req, args.id);

      return true;
    },
    async persistFavorite(root, args, { req }) {
      return libs.timeline.persistFavorite(req, args.timelineId || null);
    },
    async persistTimeline(root, args, { req }) {
      return libs.timeline.persistTimeline(
        req,
        args.id || null,
        args.version || null,
        args.timeline
      );
    },
  },
});
