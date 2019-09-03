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

export const nginxRequestRate: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): InfraMetricModel => ({
  id: InfraMetric.nginxRequestRate,
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
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-requests',
          id: 'derv-max-requests',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          id: 'posonly-derv-max-requests',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-rate', name: 'rate', field: 'derv-max-requests' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
