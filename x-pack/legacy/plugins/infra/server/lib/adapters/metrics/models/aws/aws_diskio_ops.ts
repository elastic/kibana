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

export const awsDiskioOps: InfraMetricModelCreator = (
  timeField,
  indexPattern,
  interval
): InfraMetricModel => ({
  id: InfraMetric.awsDiskioOps,
  requires: ['aws.ec2'],
  index_pattern: indexPattern,
  map_field_to: 'cloud.instance.id',
  id_type: 'cloud',
  interval: '>=5m',
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'writes',
      metrics: [
        {
          field: 'aws.ec2.diskio.write.count',
          id: 'max-diskio-writes',
          type: InfraMetricModelMetricType.max,
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'reads',
      metrics: [
        {
          field: 'aws.ec2.diskio.read.count',
          id: 'max-diskio-reads',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'inverted-avg-diskio-reads',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-max', name: 'max', field: 'max-diskio-reads' }],
          script: 'params.max * -1',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
