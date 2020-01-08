/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from '../../../../../../../../test_utils/enzyme_helpers';
import { MetricCell } from '../cells';

describe('Node Listing Metric Cell', () => {
  it('should format a percentage metric', () => {
    const props = {
      isOnline: true,
      isPercent: true,
      metric: {
        metric: {
          app: 'elasticsearch',
          field: 'node_stats.process.cpu.percent',
          metricAgg: 'max',
          label: 'CPU Utilization',
          description: 'Percentage of CPU usage for the Elasticsearch process.',
          units: '%',
          format: '0,0.[00]',
          hasCalculation: false,
          isDerivative: false,
        },
        summary: { minVal: 0, maxVal: 2, lastVal: 0, slope: -1 },
      },
    };
    expect(renderWithIntl(<MetricCell {...props} />)).toMatchSnapshot();
  });

  it('should format a non-percentage metric', () => {
    const props = {
      isOnline: true,
      isPercent: false,
      metric: {
        metric: {
          app: 'elasticsearch',
          field: 'node_stats.fs.total.available_in_bytes',
          metricAgg: 'max',
          label: 'Disk Free Space',
          description: 'Free disk space available on the node.',
          units: '',
          format: '0.0 b',
          hasCalculation: false,
          isDerivative: false,
        },
        summary: {
          minVal: 221558202368,
          maxVal: 221710200832,
          lastVal: 221559312384,
          slope: -1,
        },
      },
    };
    expect(renderWithIntl(<MetricCell {...props} />)).toMatchSnapshot();
  });

  it('should format N/A as the metric for an offline node', () => {
    const props = { isOnline: false };
    expect(renderWithIntl(<MetricCell {...props} />)).toMatchSnapshot();
  });
});
