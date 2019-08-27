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

export const nginxHits: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): InfraMetricModel => ({
  id: InfraMetric.nginxHits,
  requires: ['nginx.access'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: '200s',
      metrics: [
        {
          id: 'count-200',
          type: InfraMetricModelMetricType.count,
        },
      ],
      split_mode: 'filter',
      filter: {
        query: 'http.response.status_code:[200 TO 299]',
        language: InfraMetricModelQueryType.lucene,
      },
    },
    {
      id: '300s',
      metrics: [
        {
          id: 'count-300',
          type: InfraMetricModelMetricType.count,
        },
      ],
      split_mode: 'filter',
      filter: {
        query: 'http.response.status_code:[300 TO 399]',
        language: InfraMetricModelQueryType.lucene,
      },
    },
    {
      id: '400s',
      metrics: [
        {
          id: 'count-400',
          type: InfraMetricModelMetricType.count,
        },
      ],
      split_mode: 'filter',
      filter: {
        query: 'http.response.status_code:[400 TO 499]',
        language: InfraMetricModelQueryType.lucene,
      },
    },
    {
      id: '500s',
      metrics: [
        {
          id: 'count-500',
          type: InfraMetricModelMetricType.count,
        },
      ],
      split_mode: 'filter',
      filter: {
        query: 'http.response.status_code:[500 TO 599]',
        language: InfraMetricModelQueryType.lucene,
      },
    },
  ],
});
