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

// see discussion in: https://github.com/elastic/kibana/issues/42687

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
          id: 'sum-diskio-writes',
          type: InfraMetricModelMetricType.sum,
        },
        {
          id: 'by-second-sum-diskio-writes',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-sum', name: 'sum', field: 'sum-diskio-writes' }],
          script: 'params.sum / 300',
        },
      ],
      split_mode: 'everything',
    },
    {
      id: 'reads',
      metrics: [
        {
          field: 'aws.ec2.diskio.read.count',
          id: 'sum-diskio-reads',
          type: InfraMetricModelMetricType.sum,
        },
        {
          id: 'inverted-by-second-sum-diskio-reads',
          type: InfraMetricModelMetricType.calculation,
          variables: [{ id: 'var-sum', name: 'sum', field: 'sum-diskio-reads' }],
          script: 'params.sum / -300',
        },
      ],
      split_mode: 'everything',
    },
  ],
});
