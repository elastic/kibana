/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { sloIdSchema } from '../../schema/zod/slo';
import { allOrAnyString, dateType, statusSchema } from '../../schema/zod/common';

const bulkSnapshotRequestItemSchema = z.object({
  id: sloIdSchema,
  instanceId: allOrAnyString.optional(),
});

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

const bulkSnapshotParamsSchema = z.object({
  body: z.object({
    at: dateType,
    requests: z.array(bulkSnapshotRequestItemSchema),
  }),
});

const snapshotResponseSchema = z.object({
  at: z.string(),
  results: z.array(snapshotResultSchema),
});

const getSnapshotParamsSchema = z.object({
  path: z.object({
    id: sloIdSchema,
  }),
  query: z.object({
    at: dateType,
    instanceId: allOrAnyString.optional(),
  }),
});

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
