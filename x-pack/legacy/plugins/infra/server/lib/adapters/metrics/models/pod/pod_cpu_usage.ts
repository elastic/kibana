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

export const podCpuUsage: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): InfraMetricModel => ({
  id: InfraMetric.podCpuUsage,
  requires: ['kubernetes.pod'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'cpu',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.pod.cpu.usage.node.pct',
          id: 'avg-cpu-usage',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
  ],
});
