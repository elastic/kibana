/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchMappingOf } from '../../utils/typed_elasticsearch_mappings';
import { MetricThresholdAlertTypeParams } from './metric_threshold/types';

export const infraMetricAlertSavedObjectType = 'infrastructure-metric-alert';

export const infraAlertSavedObjectMappings: {
  [infraMetricAlertSavedObjectType]: ElasticsearchMappingOf<MetricThresholdAlertTypeParams>;
} = {
  [infraMetricAlertSavedObjectType]: {
    properties: {
      metric: {
        type: 'keyword',
      },
      indexPattern: {
        type: 'keyword',
      },
      searchField: {
        properties: {
          name: {
            type: 'keyword',
          },
          value: {
            type: 'keyword',
          },
        },
      },
      interval: {
        type: 'keyword',
      },
      threshold: {
        type: 'double',
      },
      comparator: {
        type: 'keyword',
      },
      aggregation: {
        type: 'keyword',
      },
      currentAlertState: {
        type: 'keyword',
      },
    },
  },
};
