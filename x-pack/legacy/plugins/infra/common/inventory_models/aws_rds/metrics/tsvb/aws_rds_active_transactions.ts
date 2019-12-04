/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const awsRDSActiveTransactions: TSVBMetricModelCreator = (
  timeField,
  indexPattern
): TSVBMetricModel => ({
  id: 'awsRDSActiveTransactions',
  requires: ['aws.rds'],
  index_pattern: indexPattern,
  interval: '>=300s',
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'active',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.rds.transactions.active',
          id: 'avg',
          type: 'avg',
        },
      ],
    },
    {
      id: 'blocked',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.rds.transactions.blocked',
          id: 'avg',
          type: 'avg',
        },
      ],
    },
  ],
});
