/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * Mirrors GetScheduledActionResultsResponse from get_scheduled_action_results.gen.ts.
 * Edges are raw ES search hits with dynamic osquery result columns — typed as
 * open objects matching the `z.object({})` pattern used in the generated schemas.
 */
export const actionResultsResponseSchema = schema.object(
  {
    edges: schema.arrayOf(schema.object({}, { unknowns: 'allow' })),
    total: schema.number(),
    currentPage: schema.number(),
    pageSize: schema.number(),
    totalPages: schema.number(),
    aggregations: schema.object({
      totalRowCount: schema.number(),
      totalResponded: schema.number(),
      successful: schema.number(),
      failed: schema.number(),
      pending: schema.number(),
    }),
    inspect: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  },
  { unknowns: 'allow' }
);
