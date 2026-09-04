/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { sloIdSchema } from '../../schema/zod/slo';

const bulkDeleteParamsSchema = z.object({
  body: z.object({
    list: z.array(sloIdSchema),
  }),
});

const bulkDeleteStatusParamsSchema = z.object({
  path: z.object({
    taskId: z.string().max(1024),
  }),
});

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
