/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sloIdSchema } from '../../schema/slo';

const bulkDeleteParamsSchema = t.type({
  body: t.type({
    list: t.array(sloIdSchema),
  }),
});

const bulkDeleteStatusParamsSchema = t.type({
  path: t.type({
    taskId: t.string,
  }),
});

type BulkDeleteInput = t.OutputOf<typeof bulkDeleteParamsSchema.props.body>;
type BulkDeleteParams = t.TypeOf<typeof bulkDeleteParamsSchema.props.body>;
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
