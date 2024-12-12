/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Service for the container for the anomaly charts in the
 * Machine Learning Explorer dashboard.
 * The service processes the data required to draw each of the charts
 * and manages the layout of the charts in the containing div.
 */

import type { JobId } from '../../../../common/types/anomaly_detection_jobs';
import type { SeriesConfigWithMetadata } from '../../../../common/types/results';

export interface ExplorerChartSeriesErrorMessages {
  [key: string]: JobId[];
}
export declare interface ExplorerChartsData {
  chartsPerRow: number;
  seriesToPlot: SeriesConfigWithMetadata[];
  tooManyBuckets: boolean;
  timeFieldName: string;
  errorMessages: ExplorerChartSeriesErrorMessages | undefined;
}

export function getDefaultChartsData(): ExplorerChartsData {
  return {
    chartsPerRow: 1,
    errorMessages: undefined,
    seriesToPlot: [],
    // default values, will update on every re-render
    tooManyBuckets: false,
    timeFieldName: 'timestamp',
  };
}
