/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useSingleMetricViewerChartModel } from './use_single_metric_viewer_chart_model';

describe('useSingleMetricViewerChartModel', () => {
  it('defaults includeAnomaliesTable to true and keeps a stable contextChart$ subject', () => {
    const { result, rerender } = renderHook(() => useSingleMetricViewerChartModel());
    const first$ = result.current.contextChart$;
    expect(result.current.includeAnomaliesTable).toBe(true);
    rerender();
    expect(result.current.contextChart$).toBe(first$);
  });

  it('honors includeAnomaliesTable: false', () => {
    const { result } = renderHook(() =>
      useSingleMetricViewerChartModel({ includeAnomaliesTable: false })
    );
    expect(result.current.includeAnomaliesTable).toBe(false);
  });
});
