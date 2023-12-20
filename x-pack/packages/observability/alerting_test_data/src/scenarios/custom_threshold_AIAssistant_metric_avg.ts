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

export const custom_threshold_AIAssistant_metric_avg = {
  dataView: {
    indexPattern: '.ds-metrics-apm.app.synth*',
    id: 'data-view-id-metrics',
    shouldCreate: true,
  },
  ruleParams: {
    consumer: 'logs',
    name: 'metric_synth',
    ruleTypeId: 'observability.rules.custom_threshold',
    params: {
      criteria: [
        {
          comparator: Comparator.GT,
          threshold: [0.5],
          timeSize: 2,
          timeUnit: 'h',
          metrics: [{ name: 'A', field: 'system.cpu.total.norm.pct', aggType: Aggregators.AVERAGE }],
        },
      ],
      groupBy: ['service.name'],
      searchConfiguration: {
        query: {
          query: '',
        },
      },
    },
  },
};
