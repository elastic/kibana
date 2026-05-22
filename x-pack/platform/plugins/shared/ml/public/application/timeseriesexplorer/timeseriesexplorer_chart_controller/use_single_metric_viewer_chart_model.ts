/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { Subject } from 'rxjs';

import type { ContextChartSelection } from './context_chart_zoom_pipeline';

export interface UseSingleMetricViewerChartModelOptions {
  /**
   * When false, focus pipeline skips anomalies table fetches (see plug-in contract).
   * @default true
   */
  includeAnomaliesTable?: boolean;
}

/**
 * Minimal headless primitives for hosts embedding the SMV chart.
 * Full chart state remains in `TimeSeriesExplorer` / `TimeSeriesExplorerEmbeddableChart` until those classes migrate to this hook.
 */
export function useSingleMetricViewerChartModel(
  options: UseSingleMetricViewerChartModelOptions = {}
) {
  const includeAnomaliesTable = options.includeAnomaliesTable !== false;
  const contextChart$Ref = useRef<Subject<ContextChartSelection>>();
  if (!contextChart$Ref.current) {
    contextChart$Ref.current = new Subject<ContextChartSelection>();
  }

  return {
    includeAnomaliesTable,
    contextChart$: contextChart$Ref.current,
  };
}
