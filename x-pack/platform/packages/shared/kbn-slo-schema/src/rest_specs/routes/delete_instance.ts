/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

import { sloIdSchema } from '../../schema/slo';

const deleteSLOInstancesParamsSchema = lazySchema(() =>
  z.object({
    body: z.object({
      list: z
        .array(
          z.object({
            sloId: sloIdSchema,
            instanceId: z.string().describe('The SLO instance identifier'),
            excludeRollup: z.boolean().optional(),
          })
        )
        .describe('An array of slo id and instance id'),
    }),
  })
);

type DeleteSLOInstancesInput = z.input<typeof deleteSLOInstancesParamsSchema.shape.body>;
type DeleteSLOInstancesParams = z.output<typeof deleteSLOInstancesParamsSchema.shape.body>;

export { deleteSLOInstancesParamsSchema };
export type { DeleteSLOInstancesInput, DeleteSLOInstancesParams };
