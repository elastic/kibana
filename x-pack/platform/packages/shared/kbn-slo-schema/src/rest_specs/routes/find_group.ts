/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { MAX_KEYWORD_LENGTH, MAX_QUERY_LENGTH } from '../../schema/zod/limits';
import { groupSummarySchema } from '../../schema/zod/common';

const groupBySchema = z.union([
  z.literal('ungrouped'),
  z.literal('slo.tags'),
  z.literal('status'),
  z.literal('slo.indicator.type'),
  z.literal('slo.instanceId'),
  z.literal('_index'),
  z.literal('slo.id'),
]);

const findSLOGroupsParamsSchema = z.object({
  query: z
    .object({
      page: z.string().optional(),
      perPage: z.string().optional(),
      groupBy: groupBySchema.optional(),
      groupsFilter: z
        .union([z.array(z.string().max(MAX_KEYWORD_LENGTH)), z.string().max(MAX_KEYWORD_LENGTH)])
        .optional(),
      kqlQuery: z.string().max(MAX_QUERY_LENGTH).optional(),
      filters: z.string().max(MAX_QUERY_LENGTH).optional(),
    })
    .optional(),
});

const sloGroupWithSummaryResponseSchema = z.object({
  group: z.string(),
  groupBy: groupBySchema,
  summary: groupSummarySchema,
});

const findSLOGroupsResponseSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  results: z.array(sloGroupWithSummaryResponseSchema),
});

type FindSLOGroupsParams = NonNullable<z.output<typeof findSLOGroupsParamsSchema.shape.query>>;
type FindSLOGroupsResponse = z.output<typeof findSLOGroupsResponseSchema>;

export {
  findSLOGroupsParamsSchema,
  findSLOGroupsResponseSchema,
  sloGroupWithSummaryResponseSchema,
};
export type { FindSLOGroupsParams, FindSLOGroupsResponse };
