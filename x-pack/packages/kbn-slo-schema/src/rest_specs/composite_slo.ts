/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  budgetingMethodSchema,
  compositeSloIdSchema,
  dateType,
  objectiveSchema,
  summarySchema,
  tagsSchema,
  timeWindowSchema,
  weightedAverageCompositeMethodSchema,
  weightedAverageSourceSchema,
} from '../schema';

const createCompositeSLOParamsSchema = t.type({
  body: t.intersection([
    t.type({
      name: t.string,
      timeWindow: timeWindowSchema,
      budgetingMethod: budgetingMethodSchema,
      objective: objectiveSchema,
      compositeMethod: weightedAverageCompositeMethodSchema,
      sources: t.array(weightedAverageSourceSchema),
    }),
    t.partial({ id: compositeSloIdSchema, tags: tagsSchema }),
  ]),
});

const createCompositeSLOResponseSchema = t.type({
  id: compositeSloIdSchema,
});

const compositeSLOResponseSchema = t.type({
  id: compositeSloIdSchema,
  name: t.string,
  timeWindow: timeWindowSchema,
  budgetingMethod: budgetingMethodSchema,
  objective: objectiveSchema,
  compositeMethod: weightedAverageCompositeMethodSchema,
  sources: t.array(weightedAverageSourceSchema),
  tags: tagsSchema,
  createdAt: dateType,
  updatedAt: dateType,
});

const compositeSLOWithSummaryResponseSchema = t.intersection([
  compositeSLOResponseSchema,
  t.type({ summary: summarySchema }),
]);

const updateCompositeSLOParamsSchema = t.type({
  path: t.type({
    id: compositeSloIdSchema,
  }),
  body: t.partial({
    name: t.string,
    compositeMethod: weightedAverageCompositeMethodSchema,
    sources: t.array(weightedAverageSourceSchema),
    timeWindow: timeWindowSchema,
    budgetingMethod: budgetingMethodSchema,
    objective: objectiveSchema,
    tags: tagsSchema,
  }),
});

const updateCompositeSLOResponseSchema = compositeSLOResponseSchema;

const deleteCompositeSLOParamsSchema = t.type({
  path: t.type({
    id: compositeSloIdSchema,
  }),
});

const getCompositeSLOParamsSchema = t.type({
  path: t.type({
    id: compositeSloIdSchema,
  }),
});

const getCompositeSLOResponseSchema = compositeSLOWithSummaryResponseSchema;

const sortDirectionSchema = t.union([t.literal('asc'), t.literal('desc')]);
const sortBySchema = t.literal('creationTime');
const findCompositeSLOParamsSchema = t.partial({
  query: t.partial({
    name: t.string,
    page: t.string,
    perPage: t.string,
    sortBy: sortBySchema,
    sortDirection: sortDirectionSchema,
  }),
});

const findCompositeSLOResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(compositeSLOWithSummaryResponseSchema),
});

type CreateCompositeSLOInput = t.OutputOf<typeof createCompositeSLOParamsSchema.props.body>; // Raw payload sent by the frontend
type CreateCompositeSLOParams = t.TypeOf<typeof createCompositeSLOParamsSchema.props.body>; // Parsed payload used by the backend
type CreateCompositeSLOResponse = t.OutputOf<typeof createCompositeSLOResponseSchema>; // Raw response sent to the frontend

type GetCompositeSLOResponse = t.OutputOf<typeof getCompositeSLOResponseSchema>;

type FindCompositeSLOParams = t.TypeOf<typeof findCompositeSLOParamsSchema.props.query>;
type FindCompositeSLOResponse = t.OutputOf<typeof findCompositeSLOResponseSchema>;

type UpdateCompositeSLOInput = t.OutputOf<typeof updateCompositeSLOParamsSchema.props.body>;
type UpdateCompositeSLOParams = t.TypeOf<typeof updateCompositeSLOParamsSchema.props.body>;
type UpdateCompositeSLOResponse = t.OutputOf<typeof updateCompositeSLOResponseSchema>;

export {
  compositeSLOResponseSchema,
  createCompositeSLOParamsSchema,
  deleteCompositeSLOParamsSchema,
  findCompositeSLOParamsSchema,
  findCompositeSLOResponseSchema,
  getCompositeSLOParamsSchema,
  updateCompositeSLOParamsSchema,
  updateCompositeSLOResponseSchema,
};

export type {
  CreateCompositeSLOInput,
  CreateCompositeSLOParams,
  CreateCompositeSLOResponse,
  FindCompositeSLOParams,
  FindCompositeSLOResponse,
  GetCompositeSLOResponse,
  UpdateCompositeSLOInput,
  UpdateCompositeSLOParams,
  UpdateCompositeSLOResponse,
};
