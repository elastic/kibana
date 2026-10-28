/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';
import type { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';

import { dateType } from '../../schema/common';
import { durationType } from '../../schema/duration';

const fixedAgePurge = lazySchema(() =>
  z.object({
    purgeType: z.literal('fixed_age'),
    age: durationType,
  })
);

const fixedTimePurge = lazySchema(() =>
  z.object({
    purgeType: z.literal('fixed_time'),
    timestamp: dateType,
  })
);

const bulkPurgePolicy = lazySchema(() =>
  z.discriminatedUnion('purgeType', [fixedAgePurge, fixedTimePurge])
);

const bulkPurgeRollupSchema = lazySchema(() =>
  z.object({
    body: z.object({
      list: z.array(z.string()),
      purgePolicy: bulkPurgePolicy,
      force: z.boolean().optional(),
    }),
  })
);

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
