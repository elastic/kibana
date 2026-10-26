/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const uptimeDurationAnomalyRuleParamsSchema = schema.object(
  {
    stackVersion: schema.maybe(schema.string()),
    monitorId: schema.string(),
    severity: schema.number(),
  },
  {
    meta: {
      title: 'Uptime Duration Anomaly Rule Params',
      description:
        'The parameters for the uptime duration anomaly rule. These parameters are appropriate when `rule_type_id` is `xpack.uptime.alerts.durationAnomaly`.',
    },
  }
);

export type UptimeDurationAnomalyRuleParams = TypeOf<typeof uptimeDurationAnomalyRuleParamsSchema>;
