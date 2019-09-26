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

export const awsNetworkPackets: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): InfraMetricModel => ({
  id: InfraMetric.awsNetworkPackets,
  requires: ['aws.ec2'],
  index_pattern: indexPattern,
  map_field_to: 'cloud.instance.id',
  id_type: 'cloud',
  interval: '>=5m',
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'packets-out',
      metrics: [
        {
          field: 'aws.ec2.network.out.packets',
          id: 'avg-net-out',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'packets-in',
      metrics: [
        {
          field: 'aws.ec2.network.in.packets',
          id: 'avg-net-in',
          type: InfraMetricModelMetricType.avg,
        },
        {
          id: 'inverted-avg-net-in',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-avg', name: 'avg', field: 'avg-net-in' }],
          script: 'params.avg * -1',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
