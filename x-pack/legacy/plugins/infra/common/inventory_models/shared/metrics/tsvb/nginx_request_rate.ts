/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TSVBMetricModelCreator, TSVBMetricModel } from '../../../types';

export const nginxRequestRate: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): TSVBMetricModel => ({
  id: 'nginxRequestRate',
  requires: ['nginx.stubstatus'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'rate',
      metrics: [
        {
          field: 'nginx.stubstatus.requests',
          id: 'max-requests',
          type: 'max',
        },
        {
          field: 'max-requests',
          id: 'derv-max-requests',
          type: 'derivative',
          unit: '1s',
        },
        {
          id: 'posonly-derv-max-requests',
          type: 'calculation',
          variables: [{ id: 'var-rate', name: 'rate', field: 'derv-max-requests' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
