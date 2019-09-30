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

export const hostDockerOverview: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): InfraMetricModel => ({
  id: InfraMetric.hostDockerOverview,
  requires: ['docker.info'],
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'gauge',
  series: [
    {
      id: 'total',
      metrics: [
        {
          field: 'docker.info.containers.total',
          id: 'max-total',
          type: InfraMetricModelMetricType.max,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'running',
      metrics: [
        {
          field: 'docker.info.containers.running',
          id: 'max-running',
          type: InfraMetricModelMetricType.max,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'paused',
      metrics: [
        {
          field: 'docker.info.containers.paused',
          id: 'max-paused',
          type: InfraMetricModelMetricType.max,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'stopped',
      metrics: [
        {
          field: 'docker.info.containers.stopped',
          id: 'max-stopped',
          type: InfraMetricModelMetricType.max,
        },
      ],
      split_mode: 'everything',
    },
  ],
});
