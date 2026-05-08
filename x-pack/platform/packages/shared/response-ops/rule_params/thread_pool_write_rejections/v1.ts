/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { threadPoolRejectionsCommonSchema } from '../common';

export const threadPoolWriteRejectionsParamsSchema = threadPoolRejectionsCommonSchema.extends(
  {},
  {
    meta: {
      title: 'Thread Pool Write Rejections Rule Params',
      description:
        'The parameters for the thread pool write rejections rule. These parameters are appropriate when `rule_type_id` is `monitoring_alert_thread_pool_write_rejections`.',
    },
  }
);
export type ThreadPoolWriteRejectionsParams = TypeOf<typeof threadPoolWriteRejectionsParamsSchema>;
