/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Aggregators,
  Comparator,
} from '@kbn/observability-plugin/common/custom_threshold_rule/types';

export const scenario4 = {
  dataView: {
    indexPattern: 'high-cardinality-data-fake_hosts.fake_hosts-*',
    id: 'data-view-id',
    shouldCreate: false,
  },
  ruleParams: {
    consumer: 'logs',
    name: 'custom_threshold_metric_avg',
    params: {
      criteria: [
        {
          aggType: Aggregators.CUSTOM,
          comparator: Comparator.GT,
          threshold: [80],
          timeSize: 1,
          timeUnit: 'm',
          metrics: [{ name: 'A', field: 'system.cpu.user.pct', aggType: Aggregators.AVERAGE }],
        },
      ],
      searchConfiguration: {
        query: {
          query: 'labels.scenario: custom_threshold_metric_avg',
        },
      },
    },
  },
};
