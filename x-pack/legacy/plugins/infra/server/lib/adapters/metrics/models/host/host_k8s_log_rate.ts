/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraMetricModelCreator,
  InfraMetricModelMetricType,
  InfraMetricModel,
  InfraMetricModelQueryType,
} from '../../adapter_types';
import { InfraMetric } from '../../../../../graphql/types';

export const hostK8sLogRate: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): InfraMetricModel => ({
  id: InfraMetric.hostK8sLogRate,
  map_field_to: 'kubernetes.node.name',
  requires: ['kubernetes.node'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      filter: {
        language: InfraMetricModelQueryType.kuery,
        query: 'stream : "stderr" ',
      },
      id: 'errorRate',
      metrics: [
        {
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.count,
        },
        {
          field: '61ca57f2-469d-11e7-af02-69e470af7417',
          id: 'e7cfb100-ac9a-11e9-9749-07bfc8867db3',
          type: InfraMetricModelMetricType.cumulative_sum,
        },
        {
          field: 'e7cfb100-ac9a-11e9-9749-07bfc8867db3',
          id: 'f1ab0990-ac9a-11e9-9749-07bfc8867db3',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
      ],
      split_mode: 'everything',
    },
    {
      filter: {
        language: InfraMetricModelQueryType.kuery,
        query: 'stream : "stdout"  ',
      },
      id: 'logRate',
      metrics: [
        {
          id: '0dfb1d61-ac9b-11e9-9749-07bfc8867db3',
          type: InfraMetricModelMetricType.count,
        },
        {
          field: '0dfb1d61-ac9b-11e9-9749-07bfc8867db3',
          id: '0dfb1d62-ac9b-11e9-9749-07bfc8867db3',
          type: InfraMetricModelMetricType.cumulative_sum,
        },
        {
          field: '0dfb1d62-ac9b-11e9-9749-07bfc8867db3',
          id: '0dfb1d63-ac9b-11e9-9749-07bfc8867db3',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
