/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { stackMonitoringCommonSchema } from '../common';

export const largeShardSizeParamsSchema = stackMonitoringCommonSchema.extends(
  {
    indexPattern: schema.string({}),
  },
  {
    meta: {
      id: 'large-shard-size-rule-params',
      title: 'Large Shard Size Rule Params',
      description:
        'The parameters for the large shard size rule. These parameters are appropriate when `rule_type_id` is `monitoring.large_shard_size`.',
    },
  }
);
export type LargeShardSizeParams = TypeOf<typeof largeShardSizeParamsSchema>;
