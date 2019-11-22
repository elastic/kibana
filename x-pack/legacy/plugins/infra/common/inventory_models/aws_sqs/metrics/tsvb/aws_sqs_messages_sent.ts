/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const awsSQSMessagesSent: TSVBMetricModelCreator = (
  timeField,
  indexPattern
): TSVBMetricModel => ({
  id: 'awsSQSMessagesSent',
  requires: ['aws.sqs'],
  index_pattern: indexPattern,
  interval: '>=300s',
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'sent',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.sqs.messages.sent',
          id: 'avg-sent',
          type: 'avg',
        },
      ],
    },
  ],
});
