/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import type { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';

import { dateType } from '../../schema/zod/common';
import { durationType } from '../../schema/zod/duration';

const fixedAgePurge = z.object({
  purgeType: z.literal('fixed_age'),
  age: durationType,
});

const fixedTimePurge = z.object({
  purgeType: z.literal('fixed_time'),
  timestamp: dateType,
});

const bulkPurgePolicy = z.discriminatedUnion('purgeType', [fixedAgePurge, fixedTimePurge]);

const bulkPurgeRollupSchema = z.object({
  body: z.object({
    list: z.array(z.string()),
    purgePolicy: bulkPurgePolicy,
    force: z.boolean().optional(),
  }),
});

interface BulkPurgeRollupResponse {
  taskId?: DeleteByQueryResponse['task'];
}

type BulkPurgePolicyInput = z.input<typeof bulkPurgePolicy>;
type BulkPurgeRollupInput = z.input<typeof bulkPurgeRollupSchema.shape.body>;
type BulkPurgeRollupParams = z.output<typeof bulkPurgeRollupSchema.shape.body>;

export type {
  BulkPurgeRollupResponse,
  BulkPurgePolicyInput,
  BulkPurgeRollupInput,
  BulkPurgeRollupParams,
};
export { bulkPurgeRollupSchema };
