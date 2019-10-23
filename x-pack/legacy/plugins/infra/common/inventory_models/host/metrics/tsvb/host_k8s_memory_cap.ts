/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const hostK8sMemoryCap: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'hostK8sMemoryCap',
  map_field_to: 'kubernetes.node.name',
  requires: ['kubernetes.node'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'capacity',
      metrics: [
        {
          field: 'kubernetes.node.memory.allocatable.bytes',
          id: 'max-memory-cap',
          type: 'max',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'used',
      metrics: [
        {
          field: 'kubernetes.node.memory.usage.bytes',
          id: 'avg-memory-usage',
          type: 'avg',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
