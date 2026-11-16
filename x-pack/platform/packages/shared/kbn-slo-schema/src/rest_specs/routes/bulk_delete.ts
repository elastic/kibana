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

const bulkDeleteResponseSchema = lazySchema(() =>
  z
    .object({
      taskId: z.string().describe('The taskId of the bulk delete operation'),
    })
    .meta({
      id: 'SLOBulkDeleteResponse',
      description:
        'The bulk delete SLO response returns a taskId that can be used to poll for its status',
      additionalProperties: true,
    })
);

const bulkDeleteResultSchema = lazySchema(() =>
  z
    .object({
      id: z.string().describe('The ID of the SLO that was deleted'),
      success: z.boolean().describe('The result of the deletion operation for this SLO'),
      error: z
        .string()
        .optional()
        .describe('The error message if the deletion operation failed for this SLO'),
    })
    .meta({ id: 'SLOBulkDeleteResult', additionalProperties: true })
);

const bulkDeleteStatusResponseSchema = lazySchema(() =>
  z
    .object({
      isDone: z.boolean().describe('Indicates if the bulk deletion operation is completed'),
      results: z
        .array(bulkDeleteResultSchema)
        .optional()
        .describe(
          'The results of the bulk deletion operation, including the success status and any errors for each SLO'
        ),
      error: z
        .string()
        .optional()
        .describe('The error message if the bulk deletion operation failed'),
    })
    .meta({
      id: 'SLOBulkDeleteStatusResponse',
      description:
        'Indicates if the bulk deletion is completed, with the detailed results of the operation.',
      additionalProperties: true,
    })
);

type BulkDeleteInput = z.input<typeof bulkDeleteParamsSchema.shape.body>;
type BulkDeleteParams = z.output<typeof bulkDeleteParamsSchema.shape.body>;
type BulkDeleteResponse = z.output<typeof bulkDeleteResponseSchema>;
type BulkDeleteResult = z.output<typeof bulkDeleteResultSchema>;
type BulkDeleteStatusResponse = z.output<typeof bulkDeleteStatusResponseSchema>;

export type {
  BulkDeleteInput,
  BulkDeleteParams,
  BulkDeleteResponse,
  BulkDeleteResult,
  BulkDeleteStatusResponse,
};
export {
  bulkDeleteParamsSchema,
  bulkDeleteResponseSchema,
  bulkDeleteStatusParamsSchema,
  bulkDeleteStatusResponseSchema,
};
