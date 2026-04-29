/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { stackMonitoringCommonSchema } from '../common';

export const missingMonitoringDataParamsSchema = stackMonitoringCommonSchema.extends(
  {},
  {
    meta: {
      title: 'Missing Monitoring Data Rule Params',
      description:
        'The parameters for the missing monitoring data rule. These parameters are appropriate when `rule_type_id` is `monitoring_alert_missing_monitoring_data`.',
    },
  }
);
export type MissingMonitoringDataParams = TypeOf<typeof missingMonitoringDataParamsSchema>;
