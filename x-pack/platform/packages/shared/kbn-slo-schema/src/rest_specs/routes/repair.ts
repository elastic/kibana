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

const repairActionSchema = t.type({
  type: t.union([
    t.literal('recreate-transform'),
    t.literal('start-transform'),
    t.literal('stop-transform'),
  ]),
  transformType: t.union([t.literal('rollup'), t.literal('summary')]),
});

const repairActionResultSchema = t.intersection([
  t.type({
    action: repairActionSchema,
    status: t.union([t.literal('success'), t.literal('failure')]),
  }),
  t.partial({
    error: t.unknown,
  }),
]);

const repairActionsGroupResultSchema = t.type({
  id: sloIdSchema,
  results: t.array(repairActionResultSchema),
});

type RepairParams = t.TypeOf<typeof repairParamsSchema.props.body>;
type RepairAction = t.TypeOf<typeof repairActionSchema>;
type RepairActionResult = t.TypeOf<typeof repairActionResultSchema>;
type RepairActionsGroupResult = t.TypeOf<typeof repairActionsGroupResultSchema>;

export { repairParamsSchema, repairActionsGroupResultSchema };
export type { RepairParams, RepairAction, RepairActionResult, RepairActionsGroupResult };
