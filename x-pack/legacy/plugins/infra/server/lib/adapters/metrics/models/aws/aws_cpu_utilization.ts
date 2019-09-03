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

export const awsCpuUtilization: InfraMetricModelCreator = (
  timeField,
  indexPattern
): InfraMetricModel => ({
  id: InfraMetric.awsCpuUtilization,
  requires: ['aws.ec2'],
  map_field_to: 'cloud.instance.id',
  id_type: 'cloud',
  index_pattern: indexPattern,
  interval: '>=5m',
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'cpu-util',
      metrics: [
        {
          field: 'aws.ec2.cpu.total.pct',
          id: 'avg-cpu-util',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
  ],
});
