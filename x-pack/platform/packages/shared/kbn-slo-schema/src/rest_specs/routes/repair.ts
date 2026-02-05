/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sloIdSchema } from '../../schema/slo';

const repairParamsSchema = t.type({
  body: t.type({
    list: t.array(sloIdSchema),
  }),
});

type RepairParams = t.TypeOf<typeof repairParamsSchema.props.body>;

interface RepairAction {
  type: 'recreate-transform' | 'start-transform' | 'stop-transform' | 'noop';
  transformType?: 'rollup' | 'summary';
}

interface RepairActionResult {
  action: RepairAction;
  status: 'success' | 'failure';
  error?: unknown;
}

interface RepairActionsGroupResult {
  id: string;
  results: RepairActionResult[];
}

export { repairParamsSchema };
export type { RepairParams, RepairAction, RepairActionResult, RepairActionsGroupResult };
