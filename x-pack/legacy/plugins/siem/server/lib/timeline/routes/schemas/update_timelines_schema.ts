/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { timelinesSchema, timelineId, version, pinnedEventIds } from './schemas';

export const updateTimelineSchema = Joi.object({
  request: Joi.object(),
  timeline: timelinesSchema,
  timelineSavedObjectId: timelineId,
  timelineVersion: version,
  pinnedEventIds,
});
