/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { durationType, sloIdSchema } from '../../schema';

const purgeInstancesParamsSchema = t.type({
  body: t.partial({
    list: t.array(sloIdSchema),
    staleDuration: durationType,
    force: t.boolean,
  }),
});

interface PurgeInstancesResponse {
  taskId?: string;
}

type PurgeInstancesInput = t.OutputOf<typeof purgeInstancesParamsSchema.props.body>;
type PurgeInstancesParams = t.TypeOf<typeof purgeInstancesParamsSchema.props.body>;

const purgeInstancesStatusParamsSchema = t.type({
  path: t.type({
    taskId: t.string,
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
