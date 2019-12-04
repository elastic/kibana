/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const awsRDSLatency: TSVBMetricModelCreator = (
  timeField,
  indexPattern
): TSVBMetricModel => ({
  id: 'awsRDSLatency',
  requires: ['aws.rds'],
  index_pattern: indexPattern,
  interval: '>=300s',
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'read',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.rds.latency.read',
          id: 'avg',
          type: 'avg',
        },
      ],
    },
    {
      id: 'write',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.rds.latency.write',
          id: 'avg',
          type: 'avg',
        },
      ],
    },
    {
      id: 'insert',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.rds.latency.insert',
          id: 'avg',
          type: 'avg',
        },
      ],
    },
    {
      id: 'update',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.rds.latency.update',
          id: 'avg',
          type: 'avg',
        },
      ],
    },
    {
      id: 'commit',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.rds.latency.commit',
          id: 'avg',
          type: 'avg',
        },
      ],
    },
  ],
});
