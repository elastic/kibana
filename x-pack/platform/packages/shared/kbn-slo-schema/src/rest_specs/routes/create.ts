/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { indicatorSchema, timeWindowSchema } from '../../schema';
import { allOrAnyStringOrArray } from '../../schema/common';
import {
  budgetingMethodSchema,
  objectiveSchema,
  optionalSettingsSchema,
  sloIdSchema,
  tagsSchema,
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

const createSLOResponseSchema = t.type({
  id: sloIdSchema,
});

type CreateSLOInput = t.OutputOf<typeof createSLOParamsSchema.props.body>; // Raw payload sent by the frontend
type CreateSLOParams = t.TypeOf<typeof createSLOParamsSchema.props.body>; // Parsed payload used by the backend
type CreateSLOResponse = t.TypeOf<typeof createSLOResponseSchema>; // Raw response sent to the frontend

export { createSLOParamsSchema, createSLOResponseSchema };
export type { CreateSLOInput, CreateSLOParams, CreateSLOResponse };
