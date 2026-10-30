/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';

import { sloIdSchema } from '../../schema/slo';
import { allOrAnyString, dateType, statusSchema } from '../../schema/common';
import { MAX_DATE_STRING_LENGTH } from '../../schema/limits';

const bulkSnapshotRequestItemSchema = lazySchema(() =>
  z.object({
    id: sloIdSchema,
    instanceId: allOrAnyString
      .optional()
      .describe(
        "The SLO instance ID. Omit this parameter or set it to `'*'` to return all instances for the SLO (up to 1000). Set a specific value to return that instance only."
      ),
  })
);

const snapshotErrorBudgetSchema = z.object({
  initial: z.number(),
  consumed: z.number().nullable(),
  remaining: z.number().nullable(),
});

const snapshotSummarySchema = z.object({
  status: statusSchema,
  sliValue: z.number().nullable(),
  errorBudget: snapshotErrorBudgetSchema,
  good: z.number(),
  total: z.number(),
});

const snapshotResultSchema = z.intersection(
  z.object({
    id: z.string(),
    instanceId: z.string(),
  }),
  z.union([
    z.object({ summary: snapshotSummarySchema }),
    z.object({ error: z.object({ statusCode: z.number(), message: z.string() }) }),
  ])
);

const bulkSnapshotParamsSchema = lazySchema(() =>
  z.object({
    body: z.object({
      at: dateType.describe(
        'The point in time at which to compute the SLO instance summaries, for example 2025-01-12T10:00:00.000Z'
      ),
      requests: z
        .array(bulkSnapshotRequestItemSchema)
        .describe('The list of SLO instances to compute. Limited to 100 entries.'),
    }),
  })
);

const snapshotResponseSchema = z.object({
  at: z.string(),
  results: z.array(snapshotResultSchema),
});

// Query params cannot use the `dateType` codec: the OAS query converter rejects
// codecs whose output is a class instance. The handler converts it to a Date.
const dateStringQuerySchema = lazySchema(() =>
  z
    .string()
    .max(MAX_DATE_STRING_LENGTH)
    .refine((value) => !isNaN(new Date(value).getTime()), { message: 'Invalid date' })
    .describe(
      'The point in time at which to compute the SLO instance summary (ISO 8601 date-time), for example 2023-01-12T10:03:19.000Z'
    )
);

const getSnapshotParamsSchema = lazySchema(() =>
  z.object({
    path: z.object({
      id: sloIdSchema,
    }),
    query: z.object({
      at: dateStringQuerySchema,
      instanceId: allOrAnyString
        .optional()
        .describe(
          "The SLO instance ID. Omit this parameter or set it to `'*'` to return all instances for the SLO (up to 1000). Set a specific value (for example `host.name:web-01`) to return that instance only."
        ),
    }),
  })
);

type BulkSnapshotRequestItem = z.output<typeof bulkSnapshotRequestItemSchema>;
type SnapshotSummary = z.output<typeof snapshotSummarySchema>;
type SnapshotResult = z.output<typeof snapshotResultSchema>;
type BulkSnapshotParams = z.output<typeof bulkSnapshotParamsSchema.shape.body>;
type GetSnapshotParams = z.output<typeof getSnapshotParamsSchema>;
type SnapshotResponse = z.output<typeof snapshotResponseSchema>;

export {
  bulkSnapshotParamsSchema,
  bulkSnapshotRequestItemSchema,
  getSnapshotParamsSchema,
  snapshotResponseSchema,
  snapshotResultSchema,
  snapshotSummarySchema,
};
export type {
  BulkSnapshotParams,
  BulkSnapshotRequestItem,
  GetSnapshotParams,
  SnapshotResponse,
  SnapshotResult,
  SnapshotSummary,
};
