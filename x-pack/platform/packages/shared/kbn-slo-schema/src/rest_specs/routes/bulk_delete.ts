/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sloIdSchema } from '../../schema/slo';

const bulkOperationParamsSchema = t.type({
  body: t.type({
    list: t.array(sloIdSchema),
  }),
});

const bulkOperationStatusParamsSchema = t.type({
  path: t.type({
    taskId: t.string,
  }),
});

type BulkOperationInput = t.OutputOf<typeof bulkOperationParamsSchema.props.body>;
type BulkOperationParams = t.TypeOf<typeof bulkOperationParamsSchema.props.body>;
interface BulkOperationResponse {
  taskId: string;
}

interface BulkOperationResult {
  id: string;
  success: boolean;
  error?: string;
}

interface BulkOperationStatusResponse {
  isDone: boolean;
  results?: BulkOperationResult[];
  error?: string;
}

export type {
  BulkOperationInput,
  BulkOperationParams,
  BulkOperationResponse,
  BulkOperationResult,
  BulkOperationStatusResponse,
};
export { bulkOperationParamsSchema, bulkOperationStatusParamsSchema };
