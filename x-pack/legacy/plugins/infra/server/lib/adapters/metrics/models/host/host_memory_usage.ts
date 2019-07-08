/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostMemoryUsage: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostMemoryUsage',
  requires: ['system.memory'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'free',
      metrics: [
        {
          field: 'system.memory.free',
          id: 'avg-memory-free',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'used',
      metrics: [
        {
          field: 'system.memory.actual.used.bytes',
          id: 'avg-memory-used',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'cache',
      metrics: [
        {
          field: 'system.memory.actual.used.bytes',
          id: 'avg-memory-actual-used',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'system.memory.used.bytes',
          id: 'avg-memory-used',
          type: InfraMetricModelMetricType.avg,
        },
        {
          id: 'calc-used-actual',
          script: 'params.used - params.actual',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'avg-memory-actual-used',
              id: 'var-actual',
              name: 'actual',
            },
            {
              field: 'avg-memory-used',
              id: 'var-used',
              name: 'used',
            },
          ],
        },
      ],
      split_mode: 'everything',
    },
  ],
});
