/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { jobsSelectionSchema } from '../common/utils';

export const anomalyDetectionJobsHealthRuleParamsSchema = schema.object(
  {
    includeJobs: jobsSelectionSchema,
    excludeJobs: schema.nullable(jobsSelectionSchema),
    testsConfig: schema.nullable(
      schema.object({
        datafeed: schema.nullable(
          schema.object({
            enabled: schema.boolean({ defaultValue: true }),
          })
        ),
        mml: schema.nullable(
          schema.object({
            enabled: schema.boolean({ defaultValue: true }),
          })
        ),
        delayedData: schema.nullable(
          schema.object({
            enabled: schema.boolean({ defaultValue: true }),
            docsCount: schema.nullable(schema.number({ min: 1 })),
            timeInterval: schema.nullable(schema.string()),
          })
        ),
        behindRealtime: schema.nullable(
          schema.object({
            enabled: schema.boolean({ defaultValue: true }),
            timeInterval: schema.nullable(schema.string()),
          })
        ),
        errorMessages: schema.nullable(
          schema.object({
            enabled: schema.boolean({ defaultValue: true }),
          })
        ),
      })
    ),
  },
  {
    meta: {
      title: 'Anomaly Detection Jobs Health Rule Params',
      description:
        'The parameters for the anomaly detection jobs health rule. These parameters are appropriate when `rule_type_id` is `xpack.ml.anomaly_detection_jobs_health"`.',
    },
  }
);
