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

const snapshotErrorBudgetSchema = lazySchema(() =>
  z
    .object({
      initial: z.number().describe('The initial error budget, derived from the SLO objective'),
      consumed: z
        .number()
        .nullable()
        .describe('The error budget consumed, or null when no data is available'),
      remaining: z
        .number()
        .nullable()
        .describe('The error budget remaining, or null when no data is available'),
    })
    .meta({ additionalProperties: true })
);

const snapshotSummarySchema = lazySchema(() =>
  z
    .object({
      status: statusSchema,
      sliValue: z
        .number()
        .nullable()
        .describe(
          'The SLI value at the requested point in time, or null when no data is available'
        ),
      errorBudget: snapshotErrorBudgetSchema,
      good: z.number().describe('The number of good events'),
      total: z.number().describe('The total number of events'),
    })
    .meta({ additionalProperties: true })
);

const snapshotResultBaseSchema = lazySchema(() =>
  z.object({
    id: z.string().describe('The SLO definition id'),
    instanceId: z
      .string()
      .describe("The SLO instance id. '*' represents the default (ungrouped) instance."),
  })
);

const snapshotResultSchema = lazySchema(() =>
  z
    .union([
      snapshotResultBaseSchema
        .extend({
          summary: snapshotSummarySchema.describe(
            'The SLO instance summary at the requested point in time. Present when the computation succeeded.'
          ),
        })
        .meta({ additionalProperties: true }),
      snapshotResultBaseSchema
        .extend({
          error: z
            .object({
              statusCode: z.number().describe('The HTTP status code of the error'),
              message: z.string().describe('The error message'),
            })
            .meta({ additionalProperties: true })
            .describe(
              'Error information when the computation failed for this SLO instance. Present when the computation failed.'
            ),
        })
        .meta({ additionalProperties: true }),
    ])
    .meta({
      id: 'SLOSnapshotResult',
      description:
        'The result of computing an SLO instance summary at a point in time. Contains either a summary (on success) or an error (on failure).',
    })
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

const snapshotResponseSchema = lazySchema(() =>
  z
    .object({
      at: z
        .string()
        .meta({ format: 'date-time' })
        .describe('The point in time at which the summaries were computed'),
      results: z.array(snapshotResultSchema).describe('The per-instance computation results'),
    })
    .meta({
      id: 'SLOSnapshotResponse',
      description:
        'The snapshot SLO response returns the point in time and the per-instance results. Each result contains either a summary (success) or an error (per-instance failure).',
      additionalProperties: true,
    })
);

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
