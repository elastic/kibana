/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  jobsSelectionSchema,
  mlAnomalyDetectionAlertParamsSchema,
} from '@kbn/response-ops-rule-params/anomaly_detection';

import { ALERT_PREVIEW_SAMPLE_SIZE } from '../../../common/constants/alerts';

export const mlAnomalyDetectionAlertPreviewRequest = schema.object({
  alertParams: mlAnomalyDetectionAlertParamsSchema,
  /**
   * Relative time range to look back from now, e.g. 1y, 8m, 15d
   */
  timeRange: schema.string(),
  /**
   * Number of top hits to return
   */
  sampleSize: schema.number({ defaultValue: ALERT_PREVIEW_SAMPLE_SIZE, min: 0 }),
});

export type MlAnomalyDetectionAlertParams = TypeOf<typeof mlAnomalyDetectionAlertParamsSchema>;

export type MlAnomalyDetectionAlertPreviewRequest = TypeOf<
  typeof mlAnomalyDetectionAlertPreviewRequest
>;

export const anomalyDetectionJobsHealthRuleParams = schema.object({
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
});

export type AnomalyDetectionJobsHealthRuleParams = TypeOf<
  typeof anomalyDetectionJobsHealthRuleParams
>;

export type TestsConfig = AnomalyDetectionJobsHealthRuleParams['testsConfig'];
export type JobSelection = AnomalyDetectionJobsHealthRuleParams['includeJobs'];
