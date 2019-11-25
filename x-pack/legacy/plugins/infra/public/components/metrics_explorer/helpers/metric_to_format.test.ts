/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metricToFormat } from './metric_to_format';
import { MetricsExplorerMetric } from '../../../../server/routes/metrics_explorer/types';
import { InfraFormatterType } from '../../../lib/lib';
describe('metricToFormat()', () => {
  it('should just work for numeric metrics', () => {
    const metric: MetricsExplorerMetric = { aggregation: 'avg', field: 'system.load.1' };
    expect(metricToFormat(metric)).toBe(InfraFormatterType.number);
  });
  it('should just work for byte metrics', () => {
    const metric: MetricsExplorerMetric = {
      aggregation: 'avg',
      field: 'system.network.out.bytes',
    };
    expect(metricToFormat(metric)).toBe(InfraFormatterType.bytes);
  });
  it('should just work for rate bytes metrics', () => {
    const metric: MetricsExplorerMetric = {
      aggregation: 'rate',
      field: 'system.network.out.bytes',
    };
    expect(metricToFormat(metric)).toBe(InfraFormatterType.bits);
  });
  it('should just work for rate metrics', () => {
    const metric: MetricsExplorerMetric = {
      aggregation: 'rate',
      field: 'system.cpu.user.ticks',
    };
    expect(metricToFormat(metric)).toBe(InfraFormatterType.number);
  });
  it('should just work for percent metrics', () => {
    const metric: MetricsExplorerMetric = {
      aggregation: 'avg',
      field: 'system.cpu.user.pct',
    };
    expect(metricToFormat(metric)).toBe(InfraFormatterType.percent);
  });
});
