/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import {
  occurrencesBudgetingMethodSchema,
  rollingTimeWindowSchema,
  targetSchema,
} from '../../../schema';
import { sloIdSchema, tagsSchema } from '../../../schema/slo';
import {
  compositeSloMemberSchema,
  compositeMethodSchema,
  compositeSloDefinitionSchema,
} from '../../../schema/composite_slo';

const updateCompositeSLOParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
  body: t.partial({
    name: t.string,
    description: t.string,
    members: t.array(compositeSloMemberSchema),
    compositeMethod: compositeMethodSchema,
    timeWindow: rollingTimeWindowSchema,
    budgetingMethod: occurrencesBudgetingMethodSchema,
    objective: targetSchema,
    tags: tagsSchema,
    enabled: t.boolean,
  }),
});

const updateCompositeSLOResponseSchema = compositeSloDefinitionSchema;

type UpdateCompositeSLOInput = t.OutputOf<typeof updateCompositeSLOParamsSchema.props.body>;
type UpdateCompositeSLOParams = t.TypeOf<typeof updateCompositeSLOParamsSchema.props.body>;
type UpdateCompositeSLOResponse = t.OutputOf<typeof updateCompositeSLOResponseSchema>;

export { updateCompositeSLOParamsSchema, updateCompositeSLOResponseSchema };
export type { UpdateCompositeSLOInput, UpdateCompositeSLOParams, UpdateCompositeSLOResponse };
