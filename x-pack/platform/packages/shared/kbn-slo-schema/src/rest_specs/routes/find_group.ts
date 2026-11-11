/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';

import { groupSummarySchema } from '../../schema/common';

const groupBySchema = lazySchema(() =>
  z.union([
    z.literal('ungrouped'),
    z.literal('slo.tags'),
    z.literal('status'),
    z.literal('slo.indicator.type'),
    z.literal('slo.instanceId'),
    z.literal('_index'),
    z.literal('slo.id'),
  ])
);

const findSLOGroupsParamsSchema = lazySchema(() =>
  z.object({
    query: z
      .object({
        page: z.string().optional(),
        perPage: z.string().optional(),
        groupBy: groupBySchema.optional(),
        groupsFilter: z.union([z.array(z.string()), z.string()]).optional(),
        kqlQuery: z.string().optional(),
        filters: z.string().optional(),
      })
      .optional(),
  })
);

const sloGroupWithSummaryResponseSchema = lazySchema(() =>
  z.object({
    group: z.string(),
    groupBy: groupBySchema,
    summary: groupSummarySchema,
  })
);

const findSLOGroupsResponseSchema = lazySchema(() =>
  z.object({
    page: z.number(),
    perPage: z.number(),
    total: z.number(),
    results: z.array(sloGroupWithSummaryResponseSchema),
  })
);

type FindSLOGroupsParams = NonNullable<z.output<typeof findSLOGroupsParamsSchema.shape.query>>;
type FindSLOGroupsResponse = z.input<typeof findSLOGroupsResponseSchema>;

export {
  findSLOGroupsParamsSchema,
  findSLOGroupsResponseSchema,
  sloGroupWithSummaryResponseSchema,
};
export type { FindSLOGroupsParams, FindSLOGroupsResponse };
