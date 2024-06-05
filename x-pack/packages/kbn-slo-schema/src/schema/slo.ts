/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { schema } from '@kbn/config-schema';
import { allOrAnyStringOrArray, dateType } from './common';
import { durationType } from './duration';
import { indicatorSchema } from './indicators';
import { timeWindowSchema } from './time_window';

const occurrencesBudgetingMethodSchema = t.literal('occurrences');
const timeslicesBudgetingMethodSchema = t.literal('timeslices');

const budgetingMethodSchema = t.union([
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
]);
const budgetingMethodConfigSchema = schema.oneOf([
  schema.literal('occurrences'),
  schema.literal('timeslices'),
]);

const targetSchema = t.type({ target: t.number });
const targetConfigSchema = schema.object({ target: schema.number() });

const objectiveSchema = t.intersection([
  targetSchema,
  t.partial({ timesliceTarget: t.number, timesliceWindow: durationType }),
]);
// TODO Change to intersection
const objectiveConfigSchema = schema.oneOf([
  targetConfigSchema,
  // TODO Change to partial
  // TODO Change to durationType
  schema.object({ timesliceTarget: schema.number(), timesliceWindow: schema.duration() }),
]);

const settingsSchema = t.type({
  syncDelay: durationType,
  frequency: durationType,
  preventInitialBackfill: t.boolean,
});

const groupBySchema = allOrAnyStringOrArray;

const optionalSettingsSchema = t.partial({ ...settingsSchema.props });
// TODO Change to partial
const optionalSettingsConfigSchema = schema.object({
  // TODO Change to durationType
  syncDelay: schema.duration(),
  frequency: schema.duration(),
  preventInitialBackfill: schema.boolean(),
});

const tagsSchema = t.array(t.string);
const tagsConfigSchema = schema.arrayOf(
  schema.string({
    meta: {
      description: 'An identifier for the slo.',
    },
  })
);

const sloIdSchema = t.string;
const sloIdConfigSchema = schema.string({
  meta: {
    description: 'An identifier for the slo.',
  },
});

const sloDefinitionSchema = t.type({
  id: sloIdSchema,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  timeWindow: timeWindowSchema,
  budgetingMethod: budgetingMethodSchema,
  objective: objectiveSchema,
  settings: settingsSchema,
  revision: t.number,
  enabled: t.boolean,
  tags: tagsSchema,
  createdAt: dateType,
  updatedAt: dateType,
  groupBy: groupBySchema,
  version: t.number,
});

export {
  budgetingMethodSchema,
  budgetingMethodConfigSchema,
  objectiveSchema,
  objectiveConfigSchema,
  groupBySchema,
  occurrencesBudgetingMethodSchema,
  optionalSettingsSchema,
  optionalSettingsConfigSchema,
  settingsSchema,
  sloDefinitionSchema,
  sloIdSchema,
  sloIdConfigSchema,
  tagsSchema,
  tagsConfigSchema,
  targetSchema,
  timeslicesBudgetingMethodSchema,
};
