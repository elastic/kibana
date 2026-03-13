/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ML_ANOMALY_RESULT_TYPE } from '@kbn/ml-anomaly-utils';

import { jobsSelectionSchema } from '../common/utils';
import { validateAnomalyDetectionCustomFilter } from './utils';

export const mlAnomalyDetectionAlertParamsSchema = schema.object(
  {
    jobSelection: jobsSelectionSchema,
    /** Anomaly score threshold  */
    severity: schema.number({ min: 0, max: 100 }),
    /** Result type to alert upon  */
    resultType: schema.oneOf([
      schema.literal(ML_ANOMALY_RESULT_TYPE.RECORD),
      schema.literal(ML_ANOMALY_RESULT_TYPE.BUCKET),
      schema.literal(ML_ANOMALY_RESULT_TYPE.INFLUENCER),
    ]),
    /** If true, include interim results from the anomaly detection job */
    includeInterim: schema.boolean({ defaultValue: true }),
    /** User's override for the lookback interval */
    lookbackInterval: schema.nullable(schema.string()),
    /** User's override for the top N buckets  */
    topNBuckets: schema.nullable(schema.number({ min: 1 })),
    /** Optional KQL filter */
    kqlQueryString: schema.nullable(schema.string()),
  },
  {
    validate: (params) => {
      return validateAnomalyDetectionCustomFilter(params.kqlQueryString, params.resultType);
    },
  }
);
