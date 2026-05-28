/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChartType } from '@kbn/visualization-utils';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

export interface VisualizationDimensions {
  height: number;
  width?: number;
}

export const DEFAULT_VISUALIZATION_HEIGHT = 240;

type GaugeShape =
  | { type: 'bullet'; orientation?: 'horizontal' | 'vertical' }
  | { type: 'arc' | 'circle' | 'semi_circle' };

const getGaugeDimensions = (shape: GaugeShape | undefined): VisualizationDimensions => {
  if (!shape || shape.type !== 'bullet') {
    // arc, circle, semi_circle — or missing shape defaults to bullet horizontal
    return shape ? { height: 360, width: 480 } : { height: 110, width: 768 };
  }
  return shape.orientation === 'vertical'
    ? { height: 470, width: 260 }
    : { height: 110, width: 768 };
};

/**
 * Derives visualization dimensions from a raw lens config object.
 * Used by VisualizeLens where the full config (including gauge shape) is available.
 */
export const getVisualizationDimensionsFromLensConfig = (
  lensConfig: Record<string, unknown>
): VisualizationDimensions => {
  const chartType = lensConfig.type as string | undefined;

  switch (chartType) {
    case SupportedChartType.Metric:
      return { height: 130, width: 260 };
    case SupportedChartType.Datatable:
    case 'data_table':
      return { height: 350, width: 768 };
    case SupportedChartType.Gauge: {
      const styling = lensConfig.styling as { shape?: GaugeShape } | undefined;
      return getGaugeDimensions(styling?.shape);
    }
    default:
      return { height: DEFAULT_VISUALIZATION_HEIGHT };
  }
};

/**
 * Derives visualization dimensions from a ChartType enum value.
 * Used by VisualizeESQL where only the preferred chart type is known
 * (gauge subtype is unavailable, so arc dimensions are used as the default).
 */
export const getVisualizationDimensionsFromChartType = (
  chartType?: ChartType
): VisualizationDimensions => {
  switch (chartType) {
    case ChartType.Metric:
      return { height: 130, width: 260 };
    case ChartType.Table:
      return { height: 350, width: 768 };
    case ChartType.Gauge:
      return { height: 360, width: 480 }; // arc dimensions; subtype unknown at this point
    default:
      return { height: DEFAULT_VISUALIZATION_HEIGHT };
  }
};
