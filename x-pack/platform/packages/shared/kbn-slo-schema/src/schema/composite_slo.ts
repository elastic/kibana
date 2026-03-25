/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { dateType } from './common';
import { rollingTimeWindowSchema } from './time_window';
import { occurrencesBudgetingMethodSchema, sloIdSchema, tagsSchema, targetSchema } from './slo';

const compositeSloMemberSchema = t.intersection([
  t.type({
    sloId: sloIdSchema,
    weight: t.number,
  }),
  t.partial({
    instanceId: t.string,
  }),
]);

const compositeMethodSchema = t.literal('weightedAverage');

const compositeSloDefinitionSchema = t.type({
  id: sloIdSchema,
  name: t.string,
  description: t.string,
  members: t.array(compositeSloMemberSchema),
  compositeMethod: compositeMethodSchema,
  timeWindow: rollingTimeWindowSchema,
  budgetingMethod: occurrencesBudgetingMethodSchema,
  objective: targetSchema,
  tags: tagsSchema,
  enabled: t.boolean,
  createdAt: dateType,
  updatedAt: dateType,
  createdBy: t.string,
  updatedBy: t.string,
  version: t.number,
});

const storedCompositeSloDefinitionSchema = compositeSloDefinitionSchema;

export type CompositeSLOMember = t.TypeOf<typeof compositeSloMemberSchema>;
export type CompositeMethod = t.TypeOf<typeof compositeMethodSchema>;

export {
  compositeSloMemberSchema,
  compositeMethodSchema,
  compositeSloDefinitionSchema,
  storedCompositeSloDefinitionSchema,
};
