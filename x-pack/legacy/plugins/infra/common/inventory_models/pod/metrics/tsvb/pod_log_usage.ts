/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const podLogUsage: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'podLogUsage',
  requires: ['kubernetes.pod'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'logs',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.container.logs.used.bytes',
          id: 'avg-log-used',
          type: 'avg',
        },
        {
          field: 'kubernetes.container.logs.capacity.bytes',
          id: 'max-log-cap',
          type: 'max',
        },
        {
          id: 'calc-usage-limit',
          script: 'params.usage / params.limit',
          type: 'calculation',
          variables: [
            {
              field: 'avg-log-userd',
              id: 'var-usage',
              name: 'usage',
            },
            {
              field: 'max-log-cap',
              id: 'var-limit',
              name: 'limit',
            },
          ],
        },
      ],
    },
  ],
});
