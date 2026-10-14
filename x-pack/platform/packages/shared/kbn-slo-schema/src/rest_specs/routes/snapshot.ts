/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { dateType, sloIdSchema } from '../../schema';
import { allOrAnyString, statusSchema } from '../../schema/common';

const bulkSnapshotRequestItemSchema = t.intersection([
  t.type({
    id: sloIdSchema,
  }),
  t.partial({
    instanceId: allOrAnyString,
  }),
]);

const snapshotErrorBudgetSchema = t.type({
  initial: t.number,
  consumed: t.union([t.number, t.null]),
  remaining: t.union([t.number, t.null]),
});

const snapshotSummarySchema = t.type({
  status: statusSchema,
  sliValue: t.union([t.number, t.null]),
  errorBudget: snapshotErrorBudgetSchema,
  good: t.number,
  total: t.number,
});

const snapshotResultSchema = t.intersection([
  t.type({
    id: t.string,
    instanceId: t.string,
  }),
  t.union([
    t.type({ summary: snapshotSummarySchema }),
    t.type({ error: t.type({ statusCode: t.number, message: t.string }) }),
  ]),
]);

const bulkSnapshotParamsSchema = t.type({
  body: t.type({
    at: dateType,
    requests: t.array(bulkSnapshotRequestItemSchema),
  }),
});

const snapshotResponseSchema = t.type({
  at: t.string,
  results: t.array(snapshotResultSchema),
});

const getSnapshotParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
  query: t.intersection([
    t.type({
      at: dateType,
    }),
    t.partial({
      instanceId: allOrAnyString,
    }),
  ]),
});

type BulkSnapshotRequestItem = t.TypeOf<typeof bulkSnapshotRequestItemSchema>;
type SnapshotSummary = t.TypeOf<typeof snapshotSummarySchema>;
type SnapshotResult = t.TypeOf<typeof snapshotResultSchema>;
type BulkSnapshotParams = t.TypeOf<typeof bulkSnapshotParamsSchema.props.body>;
type GetSnapshotParams = t.TypeOf<typeof getSnapshotParamsSchema>;
type SnapshotResponse = t.TypeOf<typeof snapshotResponseSchema>;

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
