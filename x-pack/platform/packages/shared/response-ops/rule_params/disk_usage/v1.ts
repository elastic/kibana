/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { stackMonitoringCommonSchema } from '../common';

export const diskUsageParamsSchema = stackMonitoringCommonSchema.extends(
  {},
  {
    meta: {
      title: 'Disk Usage Rule Params',
      description:
        'The parameters for the disk usage rule. These parameters are appropriate when `rule_type_id` is `monitoring_alert_disk_usage`.',
    },
  }
);

export type DiskUsageParams = TypeOf<typeof diskUsageParamsSchema>;
