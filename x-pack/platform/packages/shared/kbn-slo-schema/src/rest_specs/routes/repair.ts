/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { sloIdSchema } from '../../schema/zod/slo';

const repairParamsSchema = z.object({
  body: z.object({
    list: z.array(sloIdSchema),
  }),
});

type RepairParams = z.output<typeof repairParamsSchema.shape.body>;

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
