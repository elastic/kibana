/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { allOrAnyString, dateType, summarySchema } from './common';
import { durationType } from './duration';
import { indicatorSchema } from './indicators';
import { timeWindowSchema } from './time_window';

const occurrencesBudgetingMethodSchema = t.literal('occurrences');
const timeslicesBudgetingMethodSchema = t.literal('timeslices');

const budgetingMethodSchema = t.union([
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
]);

const targetSchema = t.type({ target: t.number });

const objectiveSchema = t.intersection([
  targetSchema,
  t.partial({ timesliceTarget: t.number, timesliceWindow: durationType }),
]);

const settingsSchema = t.type({
  syncDelay: durationType,
  frequency: durationType,
});

const optionalSettingsSchema = t.partial({ ...settingsSchema.props });
const tagsSchema = t.array(t.string);
const sloIdSchema = t.string;

const sloSchema = t.type({
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
  groupBy: allOrAnyString,
});

const sloWithSummarySchema = t.intersection([sloSchema, t.type({ summary: summarySchema })]);

export {
  budgetingMethodSchema,
  objectiveSchema,
  occurrencesBudgetingMethodSchema,
  optionalSettingsSchema,
  settingsSchema,
  sloIdSchema,
  sloSchema,
  sloWithSummarySchema,
  tagsSchema,
  targetSchema,
  timeslicesBudgetingMethodSchema,
};
