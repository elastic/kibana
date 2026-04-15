/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const actionResultsResponseSchema = schema.object(
  {
    edges: schema.arrayOf(schema.any()),
    total: schema.number(),
    currentPage: schema.number(),
    pageSize: schema.number(),
    totalPages: schema.number(),
    aggregations: schema.object(
      {
        totalRowCount: schema.number(),
        totalResponded: schema.number(),
        successful: schema.number(),
        failed: schema.number(),
        pending: schema.number(),
      },
      { unknowns: 'allow' }
    ),
    inspect: schema.maybe(schema.any()),
  },
  { unknowns: 'allow' }
);
