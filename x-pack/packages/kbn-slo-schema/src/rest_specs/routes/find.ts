/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { allOrAnyString, groupingsSchema, sloDefinitionSchema, summarySchema } from '../../schema';

const sortDirectionSchema = t.union([t.literal('asc'), t.literal('desc')]);
const sortBySchema = t.union([
  t.literal('error_budget_consumed'),
  t.literal('error_budget_remaining'),
  t.literal('sli_value'),
  t.literal('status'),
]);

const findSLOParamsSchema = t.partial({
  query: t.partial({
    filters: t.string,
    kqlQuery: t.string,
    page: t.string,
    perPage: t.string,
    sortBy: sortBySchema,
    sortDirection: sortDirectionSchema,
  }),
});

const sloWithDataResponseSchema = t.intersection([
  sloDefinitionSchema,
  t.partial({
    instanceId: allOrAnyString,
    remoteName: t.string,
    kibanaUrl: t.string,
  }),
  t.type({ summary: summarySchema, groupings: groupingsSchema }),
]);

const findSLOResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(sloWithDataResponseSchema),
});

type FindSLOParams = t.TypeOf<typeof findSLOParamsSchema.props.query>;
type FindSLOResponse = t.OutputOf<typeof findSLOResponseSchema>;
type SLOWithDataResponse = t.OutputOf<typeof sloWithDataResponseSchema>;

export { findSLOParamsSchema, findSLOResponseSchema };
export type { FindSLOParams, FindSLOResponse, SLOWithDataResponse };
