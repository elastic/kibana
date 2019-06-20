/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostNetworkTraffic: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostNetworkTraffic',
  requires: ['system.network'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'tx',
      metrics: [
        {
          field: 'system.network.out.bytes',
          id: 'max-net-out',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-net-out',
          id: 'deriv-max-net-out',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          id: 'posonly-deriv-max-net-out',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-rate', name: 'rate', field: 'deriv-max-net-out' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
        {
          function: 'sum',
          id: 'seriesagg-sum',
          type: InfraMetricModelMetricType.series_agg,
        },
      ],
      split_mode: 'terms',
      terms_field: 'system.network.name',
    },
    {
      id: 'rx',
      label: 'Inbound (RX)',
      metrics: [
        {
          field: 'system.network.in.bytes',
          id: 'max-net-in',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-net-in',
          id: 'deriv-max-net-in',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          id: 'posonly-deriv-max-net-in',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-rate', name: 'rate', field: 'deriv-max-net-in' }],
          script: 'params.rate > 0.0 ? params.rate : 0.0',
        },
        {
          id: 'calc-invert-rate',
          script: 'params.rate * -1',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'posonly-deriv-max-net-in',
              id: 'var-rate',
              name: 'rate',
            },
          ],
        },
        {
          function: 'sum',
          id: 'seriesagg-sum',
          type: InfraMetricModelMetricType.series_agg,
        },
      ],
      split_mode: 'terms',
      terms_field: 'system.network.name',
    },
  ],
});
