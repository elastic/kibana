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

const createCompositeSLOParamsSchema = t.type({
  body: t.intersection([
    t.type({
      name: t.string,
      description: t.string,
      members: t.array(compositeSloMemberSchema),
      compositeMethod: compositeMethodSchema,
      timeWindow: rollingTimeWindowSchema,
      budgetingMethod: occurrencesBudgetingMethodSchema,
      objective: targetSchema,
    }),
    t.partial({
      id: sloIdSchema,
      tags: tagsSchema,
      enabled: t.boolean,
    }),
  ]),
});

const createCompositeSLOResponseSchema = compositeSloDefinitionSchema;

type CreateCompositeSLOInput = t.OutputOf<typeof createCompositeSLOParamsSchema.props.body>;
type CreateCompositeSLOParams = t.TypeOf<typeof createCompositeSLOParamsSchema.props.body>;
type CreateCompositeSLOResponse = t.OutputOf<typeof createCompositeSLOResponseSchema>;

export { createCompositeSLOParamsSchema, createCompositeSLOResponseSchema };
export type { CreateCompositeSLOInput, CreateCompositeSLOParams, CreateCompositeSLOResponse };
