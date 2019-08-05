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

export const awsNetworkBytes: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): InfraMetricModel => ({
  id: InfraMetric.awsNetworkBytes,
  requires: ['system.network'],
  index_pattern: indexPattern,
  interval: '>=5m',
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'tx',
      metrics: [
        {
          field: 'aws.ec2.network.out.bytes',
          id: 'max-net-out',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'by-second-max-net-out',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-max', name: 'max', field: 'max-net-out' }],
          script: 'params.max / 300',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
