/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const awsS3UploadBytes: TSVBMetricModelCreator = (
  timeField,
  indexPattern
): TSVBMetricModel => ({
  id: 'awsS3UploadBytes',
  requires: ['aws.s3_daily_storage'],
  index_pattern: indexPattern,
  interval: '>=86400s',
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'bytes',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.s3_daily_storage.uploaded.bytes',
          id: 'max-bytes',
          type: 'max',
        },
      ],
    },
  ],
});
