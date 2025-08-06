/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { getMetricFields } from '../../lib/get_metric_fields';
import { createRoute } from '../create_route';

export const fieldsApi = createRoute({
  endpoint: 'GET /internal/metrics_experience/fields',
  security: { authz: { requiredPrivileges: ['read'] } },
  params: z.object({
    query: z.object({
      index: z.string().default('metrics-*'),
      to: z.string().default('now'),
      from: z.string().default('now-15m'),
      fields: z.string().default('*'),
    }),
  }),
  handler: async ({ context, params, logger }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const fields = await getMetricFields({
      esClient,
      indexPattern: params.query.index,
      from: params.query.from,
      to: params.query.to,
      fields: params.query.fields,
      logger,
    });
    return { fields };
  },
});
