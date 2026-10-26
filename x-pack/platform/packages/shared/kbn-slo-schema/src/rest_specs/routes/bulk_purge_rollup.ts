/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import type { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/types';

import { dateType } from '../../schema/common';
import { durationType } from '../../schema/duration';

const PURGE_TYPE_DESCRIPTION =
  'Specifies whether documents will be purged based on a specific age or on a timestamp';

const fixedAgePurge = z.object({
  purgeType: z.literal('fixed_age').describe(PURGE_TYPE_DESCRIPTION),
  age: durationType,
});

const fixedTimePurge = z.object({
  purgeType: z.literal('fixed_time').describe(PURGE_TYPE_DESCRIPTION),
  timestamp: dateType,
});

const bulkPurgePolicy = z
  .discriminatedUnion('purgeType', [fixedAgePurge, fixedTimePurge])
  .describe('Policy that dictates which SLI documents to purge based on age');

const bulkPurgeRollupSchema = z.object({
  body: z.object({
    list: z.array(z.string()).describe('An array of slo ids'),
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
