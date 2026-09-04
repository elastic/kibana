/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { MAX_KEYWORD_LENGTH } from '../../schema/zod/limits';
import { durationType } from '../../schema/zod/duration';
import { sloIdSchema } from '../../schema/zod/slo';

const purgeInstancesParamsSchema = z.object({
  body: z.object({
    list: z.array(sloIdSchema).optional(),
    staleDuration: durationType.optional(),
    force: z.boolean().optional(),
  }),
});

interface PurgeInstancesResponse {
  taskId?: string;
}

type PurgeInstancesInput = z.input<typeof purgeInstancesParamsSchema.shape.body>;
type PurgeInstancesParams = z.output<typeof purgeInstancesParamsSchema.shape.body>;

const purgeInstancesStatusParamsSchema = z.object({
  path: z.object({
    taskId: z.string().max(MAX_KEYWORD_LENGTH),
  }),
});

interface PurgeInstancesStatusResponse {
  completed: boolean;
  error?: string;
  status?: {
    total: number;
    deleted: number;
    batches: number;
    start_time_in_millis: number;
    running_time_in_nanos: number;
  };
}

export { purgeInstancesParamsSchema, purgeInstancesStatusParamsSchema };
export type {
  PurgeInstancesInput,
  PurgeInstancesParams,
  PurgeInstancesResponse,
  PurgeInstancesStatusResponse,
};
