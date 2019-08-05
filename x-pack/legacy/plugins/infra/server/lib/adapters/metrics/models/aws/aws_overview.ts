/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraMetricModelCreator,
  InfraMetricModelMetricType,
  InfraMetricModel,
} from '../../adapter_types';
import { InfraMetric } from '../../../../../graphql/types';

export const awsOverview: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): InfraMetricModel => ({
  id: InfraMetric.awsOverview,
  requires: ['aws.ec2'],
  index_pattern: indexPattern,
  map_field_to: 'cloud.instance.id',
  id_type: 'cloud',
  interval: '>=5m',
  time_field: timeField,
  type: 'gauge',
  series: [
    {
      id: 'cpu-util',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.cpu.total.pct',
          id: 'cpu-total-pct',
          type: InfraMetricModelMetricType.max,
        },
      ],
    },
    {
      id: 'status-check-failed',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.status.check_failed',
          id: 'status-check-failed',
          type: InfraMetricModelMetricType.max,
        },
      ],
    },
    {
      id: 'tx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.network.out.bytes',
          id: 'network-out-bytes',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'network-out-bytes-per-second',
          script: 'params.max / 300',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'network-out-bytes',
              id: 'var-max',
              name: 'max',
            },
          ],
        },
      ],
    },
    {
      id: 'rx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'aws.ec2.network.in.bytes',
          id: 'network-in-bytes',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'network-in-bytes-per-second',
          script: 'params.max / 300',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'network-in-bytes',
              id: 'var-max',
              name: 'max',
            },
          ],
        },
      ],
    },
  ],
});
