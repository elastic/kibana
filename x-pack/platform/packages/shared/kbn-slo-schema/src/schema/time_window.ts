/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

import { durationType } from './duration';

const rollingTimeWindowTypeSchema = lazySchema(() => z.literal('rolling'));
const rollingTimeWindowSchema = lazySchema(() =>
  z.object({
    duration: durationType.describe(
      'the duration formatted as {duration}{unit}. Accepted values for rolling: 7d, 30d, 90d'
    ),
    type: rollingTimeWindowTypeSchema.describe(
      'Indicates weither the time window is a rolling or a calendar aligned time window.'
    ),
  })
);

const calendarAlignedTimeWindowTypeSchema = lazySchema(() => z.literal('calendarAligned'));
const calendarAlignedTimeWindowSchema = lazySchema(() =>
  z.object({
    duration: durationType.describe(
      'the duration formatted as {duration}{unit}. Accepted values for calendar aligned: 1w (weekly) or 1M (monthly)'
    ),
    type: calendarAlignedTimeWindowTypeSchema.describe(
      'Indicates weither the time window is a rolling or a calendar aligned time window.'
    ),
  })
);

const timeWindowTypeSchema = lazySchema(() =>
  z.union([rollingTimeWindowTypeSchema, calendarAlignedTimeWindowTypeSchema])
);
const timeWindowSchema = lazySchema(() =>
  z
    .discriminatedUnion('type', [rollingTimeWindowSchema, calendarAlignedTimeWindowSchema])
    .meta({ id: 'SLOTimeWindow', description: 'Defines properties for the SLO time window' })
);

export {
  rollingTimeWindowSchema,
  rollingTimeWindowTypeSchema,
  calendarAlignedTimeWindowSchema,
  calendarAlignedTimeWindowTypeSchema,
  timeWindowSchema,
  timeWindowTypeSchema,
};
