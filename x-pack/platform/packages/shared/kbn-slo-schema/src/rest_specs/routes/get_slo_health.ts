/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';

import { sloIdSchema } from '../../schema/slo';
import { sloHealthSchema } from '../../schema/health';
import { allOrAnyString } from '../../schema/common';

const fetchSLOHealthResponseSchema = lazySchema(() =>
  z.array(
    z.object({
      id: sloIdSchema,
      instanceId: allOrAnyString,
      revision: z.number(),
      name: z.string(),
      health: sloHealthSchema,
    })
  )
);

const fetchSLOHealthParamsSchema = lazySchema(() =>
  z.object({
    body: z.object({
      list: z.array(z.object({ id: sloIdSchema, instanceId: allOrAnyString })),
    }),
  })
);

type FetchSLOHealthResponse = z.input<typeof fetchSLOHealthResponseSchema>;
type FetchSLOHealthParams = z.output<typeof fetchSLOHealthParamsSchema.shape.body>;

export { fetchSLOHealthParamsSchema, fetchSLOHealthResponseSchema };
export type { FetchSLOHealthParams, FetchSLOHealthResponse };
