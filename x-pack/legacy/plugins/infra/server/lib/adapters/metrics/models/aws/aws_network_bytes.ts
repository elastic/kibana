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
  requires: ['aws.ec2'],
  index_pattern: indexPattern,
  map_field_to: 'cloud.instance.id',
  id_type: 'cloud',
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
          script: 'params.max / 300', // TODO: https://github.com/elastic/kibana/issues/42687
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'rx',
      metrics: [
        {
          field: 'aws.ec2.network.in.bytes',
          id: 'max-net-in',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'inverted-by-second-max-net-in',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-max', name: 'max', field: 'max-net-in' }],
          script: 'params.max / -300', // TODO: https://github.com/elastic/kibana/issues/42687
        },
      ],
      split_mode: 'everything',
    },
  ],
});
