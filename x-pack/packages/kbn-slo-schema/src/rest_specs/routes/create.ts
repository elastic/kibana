/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { schema, TypeOf } from '@kbn/config-schema';
import {
  allOrAnyStringOrArrayConfigSchema,
  indicatorSchema,
  indicatorConfigSchema,
  timeWindowConfigSchema,
  timeWindowSchema,
} from '../../schema';
import { allOrAnyStringOrArray } from '../../schema/common';
import {
  budgetingMethodSchema,
  budgetingMethodConfigSchema,
  objectiveSchema,
  objectiveConfigSchema,
  optionalSettingsSchema,
  optionalSettingsConfigSchema,
  sloIdSchema,
  sloIdConfigSchema,
  tagsSchema,
  tagsConfigSchema,
} from '../../schema/slo';

const createSLOParamsSchema = t.type({
  body: t.intersection([
    t.type({
      name: t.string,
      description: t.string,
      indicator: indicatorSchema,
      timeWindow: timeWindowSchema,
      budgetingMethod: budgetingMethodSchema,
      objective: objectiveSchema,
    }),
    t.partial({
      id: sloIdSchema,
      settings: optionalSettingsSchema,
      tags: tagsSchema,
      groupBy: allOrAnyStringOrArray,
      revision: t.number,
    }),
  ]),
});

const createSLOParamsConfigSchema = {
  body: schema.object({
    name: schema.string(),
    description: schema.string(),
    indicator: indicatorConfigSchema,
    timeWindow: timeWindowConfigSchema,
    budgetingMethod: budgetingMethodConfigSchema,
    objective: objectiveConfigSchema,
    id: schema.maybe(sloIdConfigSchema),
    settings: schema.maybe(optionalSettingsConfigSchema),
    tags: schema.maybe(tagsConfigSchema),
    groupBy: schema.maybe(allOrAnyStringOrArrayConfigSchema),
    revision: schema.maybe(schema.number()),
  }),
};

const createSLOResponseSchema = t.type({
  id: sloIdSchema,
});

const createSLOResponseConfigSchema = {
  id: sloIdConfigSchema,
};

type CreateSLOInput = t.OutputOf<typeof createSLOParamsSchema.props.body>; // Raw payload sent by the frontend
type CreateSLOParams = t.TypeOf<typeof createSLOParamsSchema.props.body>; // Parsed payload used by the backend
type CreateSLOInputConfigSchema = TypeOf<typeof createSLOParamsConfigSchema.body>; // Parsed payload used by the frontend
type CreateSLOParamsConfigSchema = TypeOf<typeof createSLOParamsConfigSchema.body>; // Parsed payload used by the backend
type CreateSLOResponse = t.TypeOf<typeof createSLOResponseSchema>; // Raw response sent to the frontend

export {
  createSLOParamsSchema,
  createSLOParamsConfigSchema,
  createSLOResponseSchema,
  createSLOResponseConfigSchema,
};
export type {
  CreateSLOInput,
  CreateSLOInputConfigSchema,
  CreateSLOParams,
  CreateSLOParamsConfigSchema,
  CreateSLOResponse,
};
