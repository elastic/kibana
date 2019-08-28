/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMetricLabel } from './create_metric_label';
import { MetricsExplorerAggregation } from '../../../../server/routes/metrics_explorer/types';

describe('createMetricLabel()', () => {
  it('should work with metrics with fields', () => {
    const metric = { aggregation: MetricsExplorerAggregation.avg, field: 'system.load.1' };
    expect(createMetricLabel(metric)).toBe('avg(system.load.1)');
  });
  it('should work with document count', () => {
    const metric = { aggregation: MetricsExplorerAggregation.count };
    expect(createMetricLabel(metric)).toBe('count()');
  });
});
