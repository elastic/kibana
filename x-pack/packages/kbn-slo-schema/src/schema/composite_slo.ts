/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { dateType } from './common';
import { budgetingMethodSchema, objectiveSchema, sloIdSchema, tagsSchema } from './slo';
import { timeWindowSchema } from './time_window';

const compositeSloIdSchema = t.string;

const weightedAverageCompositeMethodSchema = t.literal('weightedAverage');
const weightedAverageSourceSchema = t.type({
  id: sloIdSchema,
  revision: t.number,
  weight: t.number,
});

const compositeSloSchema = t.type({
  id: compositeSloIdSchema,
  name: t.string,
  timeWindow: timeWindowSchema,
  budgetingMethod: budgetingMethodSchema,
  compositeMethod: weightedAverageCompositeMethodSchema,
  objective: objectiveSchema,
  sources: t.array(weightedAverageSourceSchema),
  tags: tagsSchema,
  createdAt: dateType,
  updatedAt: dateType,
});

export {
  weightedAverageSourceSchema,
  weightedAverageCompositeMethodSchema,
  compositeSloIdSchema,
  compositeSloSchema,
};
