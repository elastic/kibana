/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeatmapVisualizationState } from '@kbn/lens-common';
import type { VizStateAdapter } from './types';
import { flattenToDotPaths, unflattenFromDotPaths } from './dot_path_helpers';

/** Minimal shape of the API config sections relevant for heatmap styling. */
interface HeatmapAPIStyling {
  legend?: {
    visibility?: string;
    position?: string;
    truncate_after_lines?: number;
    size?: string;
  };
  axis?: {
    x?: {
      labels?: { visible?: boolean; orientation?: string };
      title?: { visible?: boolean; text?: string };
    };
    y?: {
      labels?: { visible?: boolean };
      title?: { visible?: boolean; text?: string };
    };
  };
  styling?: {
    cells?: {
      labels?: { visible?: boolean };
    };
  };
}

/**
 * Convert HeatmapVisualizationState → API styling format (legend + axis + styling).
 */
const stateToAPIFormat = (state: HeatmapVisualizationState): HeatmapAPIStyling => {
  const { legend, gridConfig } = state;

  return {
    legend: {
      visibility: legend.isVisible ? 'visible' : 'hidden',
      position: legend.position,
      ...(legend.maxLines != null ? { truncate_after_lines: legend.maxLines } : {}),
      ...(legend.legendSize != null ? { size: legend.legendSize } : {}),
    },
    axis: {
      x: {
        labels: {
          visible: gridConfig.isXAxisLabelVisible,
          ...(gridConfig.xAxisLabelRotation != null
            ? {
                orientation:
                  gridConfig.xAxisLabelRotation === -90
                    ? 'vertical'
                    : gridConfig.xAxisLabelRotation === -45
                    ? 'angled'
                    : 'horizontal',
              }
            : {}),
        },
        title: {
          visible: gridConfig.isXAxisTitleVisible,
          ...(gridConfig.xTitle ? { text: gridConfig.xTitle } : {}),
        },
      },
      y: {
        labels: { visible: gridConfig.isYAxisLabelVisible },
        title: {
          visible: gridConfig.isYAxisTitleVisible,
          ...(gridConfig.yTitle ? { text: gridConfig.yTitle } : {}),
        },
      },
    },
    styling: {
      cells: {
        labels: { visible: gridConfig.isCellLabelVisible },
      },
    },
  };
};

/**
 * Convert API config back to HeatmapVisualizationState styling fields.
 */
const apiFormatToState = (apiConfig: HeatmapAPIStyling): Partial<HeatmapVisualizationState> => {
  const orientationToRotation = (orientation?: string): number | undefined => {
    switch (orientation) {
      case 'vertical':
        return -90;
      case 'angled':
        return -45;
      case 'horizontal':
        return 0;
      default:
        return undefined;
    }
  };

  const result: Partial<HeatmapVisualizationState> = {};

  if (apiConfig.legend) {
    result.legend = {
      type: 'heatmap_legend',
      isVisible: apiConfig.legend.visibility !== 'hidden',
      position: (apiConfig.legend.position ??
        'right') as HeatmapVisualizationState['legend']['position'],
      ...(apiConfig.legend.truncate_after_lines != null
        ? {
            maxLines: apiConfig.legend.truncate_after_lines,
            shouldTruncate: true,
          }
        : {}),
      ...(apiConfig.legend.size != null
        ? {
            legendSize: apiConfig.legend.size as HeatmapVisualizationState['legend']['legendSize'],
          }
        : {}),
    };
  }

  if (apiConfig.axis || apiConfig.styling) {
    result.gridConfig = {
      type: 'heatmap_grid',
      isCellLabelVisible: apiConfig.styling?.cells?.labels?.visible ?? false,
      isXAxisLabelVisible: apiConfig.axis?.x?.labels?.visible ?? true,
      isXAxisTitleVisible: apiConfig.axis?.x?.title?.visible ?? false,
      isYAxisLabelVisible: apiConfig.axis?.y?.labels?.visible ?? true,
      isYAxisTitleVisible: apiConfig.axis?.y?.title?.visible ?? false,
      ...(apiConfig.axis?.x?.title?.text ? { xTitle: apiConfig.axis.x.title.text } : {}),
      ...(apiConfig.axis?.y?.title?.text ? { yTitle: apiConfig.axis.y.title.text } : {}),
      ...(apiConfig.axis?.x?.labels?.orientation != null
        ? {
            xAxisLabelRotation: orientationToRotation(apiConfig.axis.x.labels.orientation),
          }
        : {}),
    };
  }

  return result;
};

export const heatmapStateAdapter: VizStateAdapter<HeatmapVisualizationState> = {
  stateToFormValues(state) {
    const apiFormat = stateToAPIFormat(state);
    return flattenToDotPaths(apiFormat as Record<string, unknown>);
  },

  formValuesToState(currentState, formValues) {
    const apiConfig = unflattenFromDotPaths(formValues) as HeatmapAPIStyling;
    const stylingState = apiFormatToState(apiConfig);
    return { ...currentState, ...stylingState };
  },
};
