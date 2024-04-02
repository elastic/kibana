/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  allOrAnyString,
  allOrAnyStringOrArray,
  budgetingMethodSchema,
  dateType,
  groupingsSchema,
  indicatorSchema,
  metaSchema,
  objectiveSchema,
  settingsSchema,
  sloIdSchema,
  summarySchema,
  tagsSchema,
  timeWindowSchema,
} from '../schema';

const sloResponseSchema = t.intersection([
  t.type({
    id: sloIdSchema,
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    timeWindow: timeWindowSchema,
    budgetingMethod: budgetingMethodSchema,
    objective: objectiveSchema,
    revision: t.number,
    settings: settingsSchema,
    enabled: t.boolean,
    tags: tagsSchema,
    groupBy: allOrAnyStringOrArray,
    createdAt: dateType,
    updatedAt: dateType,
    version: t.number,
  }),
  t.partial({
    instanceId: allOrAnyString,
    remoteName: t.string,
    kibanaUrl: t.string,
  }),
]);

const sloWithSummaryResponseSchema = t.intersection([
  sloResponseSchema,
  t.type({ summary: summarySchema, groupings: groupingsSchema }),
  t.partial({ meta: metaSchema }),
]);

type SLOResponse = t.OutputOf<typeof sloResponseSchema>;
type SLOWithSummaryResponse = t.OutputOf<typeof sloWithSummaryResponseSchema>;

export { sloWithSummaryResponseSchema };
export type { SLOResponse, SLOWithSummaryResponse };
