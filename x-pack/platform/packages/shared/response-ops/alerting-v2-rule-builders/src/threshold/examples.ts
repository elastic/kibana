/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleBuilderExample } from '../types';
import { Aggregation, Comparator } from './form_types';
import type { ThresholdParams } from './params_schema';

export const THRESHOLD_EXAMPLES: ReadonlyArray<RuleBuilderExample<ThresholdParams>> = [
  {
    description: 'Alert per host when average CPU stays above 90%, recovering below 80%.',
    params: {
      indexPattern: 'metrics-system.cpu-*',
      timeField: '@timestamp',
      stats: [
        { label: 'avg_cpu', aggregation: Aggregation.AVG, field: 'system.cpu.total.norm.pct' },
      ],
      evaluations: [],
      alertConditions: [{ metric: 'avg_cpu', comparator: Comparator.GT, threshold: [0.9] }],
      conditionOperator: 'AND',
      groupByFields: ['host.name'],
      recovery: {
        conditions: [{ metric: 'avg_cpu', comparator: Comparator.LT, threshold: [0.8] }],
        conditionOperator: 'AND',
      },
    },
  },
  {
    description:
      'Alert per service when the 5xx error rate is above 5%, critical above 20%, ignoring health checks.',
    params: {
      indexPattern: 'logs-*',
      timeField: '@timestamp',
      filterQuery: 'url.path != "/health"',
      stats: [
        {
          label: 'errors',
          aggregation: Aggregation.COUNT,
          filter: 'http.response.status_code >= 500',
        },
        { label: 'total', aggregation: Aggregation.COUNT },
      ],
      evaluations: [{ label: 'error_rate', expression: 'errors / total * 100' }],
      alertConditions: [{ metric: 'error_rate', comparator: Comparator.GT, threshold: [5] }],
      conditionOperator: 'AND',
      groupByFields: ['service.name'],
      severity: {
        mode: 'multi',
        singleLevelSeverity: 'info',
        levels: [
          { severity: 'medium', threshold: 10 },
          { severity: 'critical', threshold: 20 },
        ],
      },
    },
  },
];
