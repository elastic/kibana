/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const containerCpuUsage: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'containerCpuUsage',
  requires: ['docker.cpu'],
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
          field: 'docker.cpu.total.pct',
          id: 'avg-cpu-total',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
  ],
});
