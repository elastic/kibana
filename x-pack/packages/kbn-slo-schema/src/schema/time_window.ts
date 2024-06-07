/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { schema } from '@kbn/config-schema';
import { durationType, durationTypeConfigSchema } from './duration';

const rollingTimeWindowTypeSchema = t.literal('rolling');
const rollingTimeWindowSchema = t.type({
  duration: durationType,
  type: rollingTimeWindowTypeSchema,
});

const calendarAlignedTimeWindowTypeSchema = t.literal('calendarAligned');
const calendarAlignedTimeWindowSchema = t.type({
  duration: durationType,
  type: calendarAlignedTimeWindowTypeSchema,
});

const timeWindowTypeSchema = t.union([
  rollingTimeWindowTypeSchema,
  calendarAlignedTimeWindowTypeSchema,
]);
const timeWindowSchema = t.union([rollingTimeWindowSchema, calendarAlignedTimeWindowSchema]);
const timeWindowConfigSchema = schema.oneOf([
  schema.object({
    type: schema.literal('rolling'),
    duration: durationTypeConfigSchema,
  }),
  schema.object({
    type: schema.literal('calendarAligned'),
    duration: durationTypeConfigSchema,
  }),
]);

export {
  rollingTimeWindowSchema,
  rollingTimeWindowTypeSchema,
  calendarAlignedTimeWindowSchema,
  calendarAlignedTimeWindowTypeSchema,
  timeWindowSchema,
  timeWindowConfigSchema,
  timeWindowTypeSchema,
};
