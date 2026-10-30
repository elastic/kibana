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

const PURGE_TYPE_DESCRIPTION =
  'Specifies whether documents will be purged based on a specific age or on a timestamp';

const fixedAgePurge = lazySchema(() =>
  z.object({
    purgeType: z.literal('fixed_age').describe(PURGE_TYPE_DESCRIPTION),
    age: durationType.describe(
      'The duration to determine which documents to purge, formatted as {duration}{unit}. This value should be greater than or equal to the time window of every SLO provided.'
    ),
  })
);

const fixedTimePurge = lazySchema(() =>
  z.object({
    purgeType: z.literal('fixed_time').describe(PURGE_TYPE_DESCRIPTION),
    timestamp: dateType.describe(
      'The timestamp to determine which documents to purge, formatted in ISO. This value should be older than the applicable time window of every SLO provided.'
    ),
  })
);

const bulkPurgePolicy = lazySchema(() =>
  z
    .discriminatedUnion('purgeType', [fixedAgePurge, fixedTimePurge])
    .describe('Policy that dictates which SLI documents to purge based on age')
);

const bulkPurgeRollupSchema = lazySchema(() =>
  z.object({
    body: z.object({
      list: z.array(z.string()).describe('An array of slo ids'),
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
