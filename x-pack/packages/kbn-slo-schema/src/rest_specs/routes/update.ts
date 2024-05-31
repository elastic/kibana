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
  sloDefinitionSchema,
  sloIdSchema,
  tagsSchema,
} from '../../schema/slo';

const updateSLOParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
  body: t.partial({
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    timeWindow: timeWindowSchema,
    budgetingMethod: budgetingMethodSchema,
    objective: objectiveSchema,
    settings: optionalSettingsSchema,
    tags: tagsSchema,
    groupBy: allOrAnyStringOrArray,
  }),
});

const updateSLOResponseSchema = sloDefinitionSchema;

type UpdateSLOInput = t.OutputOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOParams = t.TypeOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOResponse = t.OutputOf<typeof updateSLOResponseSchema>;

export { updateSLOParamsSchema, updateSLOResponseSchema };
export type { UpdateSLOInput, UpdateSLOParams, UpdateSLOResponse };
