/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { dateType, errorBudgetSchema, statusSchema } from './common';
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

const compositeSloBaseDefinitionSchema = t.type({
  id: sloIdSchema,
  name: t.string,
  description: t.string,
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

const compositeSloDefinitionSchema = t.intersection([
  compositeSloBaseDefinitionSchema,
  t.type({
    members: t.array(compositeSloMemberSchema),
  }),
]);

const storedCompositeSloDefinitionSchema = compositeSloDefinitionSchema;

const compositeSloMemberSummarySchema = t.intersection([
  t.type({
    id: t.string,
    name: t.string,
    weight: t.number,
    normalisedWeight: t.number,
    sliValue: t.number,
    contribution: t.number,
    status: statusSchema,
  }),
  t.partial({
    instanceId: t.string,
  }),
]);

const compositeSloSummarySchema = t.type({
  sliValue: t.number,
  errorBudget: errorBudgetSchema,
  status: statusSchema,
  fiveMinuteBurnRate: t.number,
  oneHourBurnRate: t.number,
  oneDayBurnRate: t.number,
});

export type CompositeSLOMember = t.TypeOf<typeof compositeSloMemberSchema>;
export type CompositeMethod = t.TypeOf<typeof compositeMethodSchema>;
export type CompositeSLOMemberSummary = t.TypeOf<typeof compositeSloMemberSummarySchema>;
export type CompositeSLOSummary = t.TypeOf<typeof compositeSloSummarySchema>;

export {
  compositeSloMemberSchema,
  compositeMethodSchema,
  compositeSloBaseDefinitionSchema,
  compositeSloDefinitionSchema,
  storedCompositeSloDefinitionSchema,
  compositeSloMemberSummarySchema,
  compositeSloSummarySchema,
};
