/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { sloIdSchema } from '../../schema/zod/slo';
import { transformHealthSchema } from '../../schema/zod/health';
import { allOrAnyString } from '../../schema/zod/common';

const fetchSLOHealthResponseSchema = z.array(
  z.object({
    id: sloIdSchema,
    instanceId: allOrAnyString,
    revision: z.number(),
    name: z.string(),
    health: z.object({
      isProblematic: z.boolean(),
      rollup: transformHealthSchema,
      summary: transformHealthSchema,
    }),
  })
);

const fetchSLOHealthParamsSchema = z.object({
  body: z.object({
    list: z.array(z.object({ id: sloIdSchema, instanceId: allOrAnyString })),
  }),
});

type FetchSLOHealthResponse = z.input<typeof fetchSLOHealthResponseSchema>;
type FetchSLOHealthParams = z.output<typeof fetchSLOHealthParamsSchema.shape.body>;

export { fetchSLOHealthParamsSchema, fetchSLOHealthResponseSchema };
export type { FetchSLOHealthParams, FetchSLOHealthResponse };
