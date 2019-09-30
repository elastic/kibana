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

export const hostDockerTop5ByCpu: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): InfraMetricModel => ({
  id: InfraMetric.hostDockerTop5ByCpu,
  requires: ['docker.cpu'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'avg-cpu',
      metrics: [
        {
          field: 'docker.cpu.total.pct',
          id: 'avg-cpu-metric',
          type: InfraMetricModelMetricType.avg,
        },
      ],
      split_mode: 'terms',
      terms_field: 'container.name',
      terms_order_by: 'avg-cpu',
      terms_size: 5,
    },
  ],
});
