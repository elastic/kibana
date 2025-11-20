/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sloIdSchema } from '../../schema/slo';
import { allOrAnyString } from '../../schema';

const repairParamsSchema = t.type({
  body: t.type({
    list: t.array(t.type({ id: sloIdSchema, instanceId: allOrAnyString, enabled: t.boolean })),
  }),
});

const repairStatusParamsSchema = t.type({
  path: t.type({
    taskId: t.string,
  }),
});

type RepairInput = t.OutputOf<typeof repairParamsSchema.props.body>;
type RepairParams = t.TypeOf<typeof repairParamsSchema.props.body>;
interface RepairResponse {
  taskId: string;
}

interface RepairResult {
  id: string;
  success: boolean;
  error?: string;
}

interface RepairStatusResponse {
  isDone: boolean;
  results?: RepairResult[];
  error?: string;
}

export type { RepairInput, RepairParams, RepairResponse, RepairResult, RepairStatusResponse };
export { repairParamsSchema, repairStatusParamsSchema };
