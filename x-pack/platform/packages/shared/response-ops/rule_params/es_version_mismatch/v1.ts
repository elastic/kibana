/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { stackMonitoringCommonSchema } from '../common';

export const esVersionMismatchParamsSchema = stackMonitoringCommonSchema.extends(
  {},
  {
    meta: {
      title: 'ES Version Mismatch Rule Params',
      description:
        'The parameters for the ES version mismatch rule. These parameters are appropriate when `rule_type_id` is `monitoring_alert_elasticsearch_version_mismatch`.',
    },
  }
);

export type EsVersionMismatchParams = TypeOf<typeof esVersionMismatchParamsSchema>;
