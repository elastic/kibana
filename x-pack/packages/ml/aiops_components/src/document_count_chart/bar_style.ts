/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BarStyleAccessor } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';

import { LOG_RATE_ANALYSIS_HIGHLIGHT_COLOR } from '@kbn/aiops-log-rate-analysis';
import type { DocumentCountStatsChangePoint } from '@kbn/aiops-log-rate-analysis';

import { DOCUMENT_COUNT_CHART_OVERALL_SERIES_SPEC_ID } from './constants';

const logRateAnalysisHighlightedBarStyle = {
  rect: {
    opacity: 1,
    fill: LOG_RATE_ANALYSIS_HIGHLIGHT_COLOR,
  },
};

export const getLogRateAnalysisBarStyleAccessor =
  (changePoint: DocumentCountStatsChangePoint): BarStyleAccessor =>
  (d, g) => {
    return g.specId === DOCUMENT_COUNT_CHART_OVERALL_SERIES_SPEC_ID &&
      changePoint &&
      d.x > changePoint.startTs &&
      d.x < changePoint.endTs
      ? logRateAnalysisHighlightedBarStyle
      : null;
  };
