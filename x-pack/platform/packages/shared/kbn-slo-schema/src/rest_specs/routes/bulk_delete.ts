/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';

import { sloIdSchema } from '../../schema/slo';

const bulkDeleteParamsSchema = lazySchema(() =>
  z.object({
    body: z.object({
      list: z.array(sloIdSchema).describe('An array of SLO Definition id'),
    }),
  })
);

const bulkDeleteStatusParamsSchema = lazySchema(() =>
  z.object({
    path: z.object({
      taskId: z.string().describe('The task id of the bulk delete operation'),
    }),
  })
);

type BulkDeleteInput = z.input<typeof bulkDeleteParamsSchema.shape.body>;
type BulkDeleteParams = z.output<typeof bulkDeleteParamsSchema.shape.body>;
interface BulkDeleteResponse {
  taskId: string;
}

interface BulkDeleteResult {
  id: string;
  success: boolean;
  error?: string;
}

interface BulkDeleteStatusResponse {
  isDone: boolean;
  results?: BulkDeleteResult[];
  error?: string;
}

export type {
  BulkDeleteInput,
  BulkDeleteParams,
  BulkDeleteResponse,
  BulkDeleteResult,
  BulkDeleteStatusResponse,
};
export { bulkDeleteParamsSchema, bulkDeleteStatusParamsSchema };
