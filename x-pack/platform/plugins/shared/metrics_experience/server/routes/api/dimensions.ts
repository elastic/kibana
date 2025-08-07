/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createRoute } from '../create_route';
import { createDimensions } from '../../lib/create_dimentions'; // <-- import the new function

export const dimensionsApi = createRoute({
  endpoint: 'POST /internal/metrics_experience/dimensions',
  security: { authz: { requiredPrivileges: ['read'] } },
  params: z.object({
    body: z.object({
      dimensions: z.array(z.string()),
      indices: z.array(z.string()).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  }),
  handler: async ({ context, params, logger }) => {
    const { dimensions, indices = ['metrics-*'], from, to } = params.body;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    if (!dimensions || dimensions.length === 0) {
      return { values: [] };
    }

    const values = await createDimensions({
      esClient,
      dimensions,
      indices,
      from,
      to,
      logger,
    });

    return { values };
  },
});
