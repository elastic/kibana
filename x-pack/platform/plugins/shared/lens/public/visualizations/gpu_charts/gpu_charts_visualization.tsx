/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Ast } from '@kbn/interpreter';
import type { PaletteRegistry } from '@kbn/coloring';
import type { ThemeServiceStart } from '@kbn/core/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import type {
  OperationMetadata,
  Visualization,
  VisualizationSuggestion,
  VisualizationType,
} from '@kbn/lens-common';
import { layerTypes } from '../..';
import type { GpuChartsVisualizationState } from './types';
import type { GpuChartShape } from './constants';
import {
  LENS_GPU_CHARTS_ID,
  GPU_SCATTER_3D_ID,
  GPU_HEXAGON_ID,
  GPU_CHARTS_EXPRESSION,
  CHART_SHAPES,
  CHART_NAMES,
  GROUP_ID,
} from './constants';
import { GpuChartsDimensionEditor } from './dimension_editor';
import { isGpuRenderingSupported } from './gpu_capabilities';

interface GpuChartsVisualizationDeps {
  paletteService: PaletteRegistry;
  theme: ThemeServiceStart;
}

function getInitialState(): Omit<GpuChartsVisualizationState, 'layerId' | 'layerType'> {
  return {
    shape: CHART_SHAPES.SCATTER_3D,
    pointSize: 5,
    pointOpacity: 0.8,
    hexagonRadius: 1000,
    hexagonElevationScale: 1,
  };
}

const isNumericOperation = (op: OperationMetadata) => op.dataType === 'number' && !op.isStaticValue;

const isBucketedOperation = (op: OperationMetadata) => op.isBucketed;

export const getGpuChartsVisualization = ({
  paletteService,
  theme,
}: GpuChartsVisualizationDeps): Visualization<GpuChartsVisualizationState> => ({
  id: LENS_GPU_CHARTS_ID,

  visualizationTypes: [
    {
      id: GPU_SCATTER_3D_ID,
      icon: 'visScatter',
      label: CHART_NAMES.scatter3d.label,
      description: CHART_NAMES.scatter3d.description,
      sortPriority: 2,
    },
    {
      id: GPU_HEXAGON_ID,
      icon: 'heatmap',
      label: CHART_NAMES.hexagon.label,
      description: CHART_NAMES.hexagon.description,
      sortPriority: 2,
    },
  ] as VisualizationType[],

  getVisualizationTypeId(state) {
    return state.shape === CHART_SHAPES.SCATTER_3D ? GPU_SCATTER_3D_ID : GPU_HEXAGON_ID;
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  clearLayer(state) {
    return {
      ...state,
      xAccessor: undefined,
      yAccessor: undefined,
      zAccessor: undefined,
      colorAccessor: undefined,
      sizeAccessor: undefined,
      groupAccessor: undefined,
    };
  },

  getDescription(state) {
    if (state.shape === CHART_SHAPES.SCATTER_3D) {
      return CHART_NAMES.scatter3d;
    }
    return CHART_NAMES.hexagon;
  },

  switchVisualizationType(visualizationTypeId, state) {
    const newShape: GpuChartShape =
      visualizationTypeId === GPU_SCATTER_3D_ID ? CHART_SHAPES.SCATTER_3D : CHART_SHAPES.HEXAGON;

    return {
      ...state,
      shape: newShape,
      // Clear Z accessor if switching to hexagon (2D only)
      zAccessor: newShape === CHART_SHAPES.HEXAGON ? undefined : state.zAccessor,
    };
  },

  initialize(addNewLayer, state) {
    return (
      state || {
        layerId: addNewLayer(),
        layerType: layerTypes.DATA,
        ...getInitialState(),
      }
    );
  },

  // Hide from chart switcher if WebGL2 is not available
  hideFromChartSwitch() {
    return !isGpuRenderingSupported();
  },

  triggers: [VIS_EVENT_TO_TRIGGER.brush, VIS_EVENT_TO_TRIGGER.filter],

  getSuggestions({ state, table }): Array<VisualizationSuggestion<GpuChartsVisualizationState>> {
    // Only suggest for tables with at least 2 numeric columns
    const numericColumns = table.columns.filter(
      (col) => col.operation.dataType === 'number' && !col.operation.isBucketed
    );

    if (numericColumns.length < 2) {
      return [];
    }

    // Don't suggest if GPU rendering isn't supported
    if (!isGpuRenderingSupported()) {
      return [];
    }

    // Prefer GPU charts for high-cardinality data (> 10k rows indicator)
    const isHighCardinality = table.columns.some(
      (col) => col.operation.scale === 'ratio' || col.operation.scale === 'interval'
    );

    if (!isHighCardinality && table.changeType === 'unchanged') {
      return [];
    }

    const suggestions: Array<VisualizationSuggestion<GpuChartsVisualizationState>> = [];

    // 3D Scatter suggestion (needs at least 3 numeric columns)
    if (numericColumns.length >= 3) {
      suggestions.push({
        title: i18n.translate('xpack.lens.gpuCharts.scatter3dSuggestion', {
          defaultMessage: '3D Scatter Plot',
        }),
        score: isHighCardinality ? 0.7 : 0.3,
        previewIcon: 'visScatter',
        state: {
          ...getInitialState(),
          layerId: table.layerId,
          layerType: 'data',
          shape: CHART_SHAPES.SCATTER_3D,
          xAccessor: numericColumns[0].columnId,
          yAccessor: numericColumns[1].columnId,
          zAccessor: numericColumns[2].columnId,
          colorAccessor: numericColumns[3]?.columnId,
        },
      });
    }

    // Hexagon density suggestion (needs at least 2 numeric columns)
    suggestions.push({
      title: i18n.translate('xpack.lens.gpuCharts.hexagonSuggestion', {
        defaultMessage: 'Hexagonal Density',
      }),
      score: isHighCardinality ? 0.6 : 0.2,
      previewIcon: 'heatmap',
      state: {
        ...getInitialState(),
        layerId: table.layerId,
        layerType: 'data',
        shape: CHART_SHAPES.HEXAGON,
        xAccessor: numericColumns[0].columnId,
        yAccessor: numericColumns[1].columnId,
        colorAccessor: numericColumns[2]?.columnId,
      },
    });

    return suggestions;
  },

  getConfiguration({ state, frame }) {
    // Check if the layer exists in the frame's datasource layers
    const datasourceLayer = frame?.datasourceLayers?.[state.layerId];
    if (!datasourceLayer) {
      return { groups: [] };
    }

    const isScatter3d = state.shape === CHART_SHAPES.SCATTER_3D;

    return {
      groups: [
        {
          groupId: GROUP_ID.X,
          groupLabel: i18n.translate('xpack.lens.gpuCharts.xAxisLabel', {
            defaultMessage: 'X-axis',
          }),
          layerId: state.layerId,
          accessors: state.xAccessor ? [{ columnId: state.xAccessor, triggerIcon: 'none' }] : [],
          supportsMoreColumns: !state.xAccessor,
          filterOperations: isNumericOperation,
          required: true,
          dataTestSubj: 'lnsGpuCharts_xDimensionPanel',
        },
        {
          groupId: GROUP_ID.Y,
          groupLabel: i18n.translate('xpack.lens.gpuCharts.yAxisLabel', {
            defaultMessage: 'Y-axis',
          }),
          layerId: state.layerId,
          accessors: state.yAccessor ? [{ columnId: state.yAccessor, triggerIcon: 'none' }] : [],
          supportsMoreColumns: !state.yAccessor,
          filterOperations: isNumericOperation,
          required: true,
          dataTestSubj: 'lnsGpuCharts_yDimensionPanel',
        },
        // Z-axis only for 3D scatter
        ...(isScatter3d
          ? [
              {
                groupId: GROUP_ID.Z,
                groupLabel: i18n.translate('xpack.lens.gpuCharts.zAxisLabel', {
                  defaultMessage: 'Z-axis',
                }),
                layerId: state.layerId,
                accessors: state.zAccessor
                  ? [{ columnId: state.zAccessor, triggerIcon: 'none' }]
                  : [],
                supportsMoreColumns: !state.zAccessor,
                filterOperations: isNumericOperation,
                required: false,
                dataTestSubj: 'lnsGpuCharts_zDimensionPanel',
              },
            ]
          : []),
        {
          groupId: GROUP_ID.COLOR,
          groupLabel: i18n.translate('xpack.lens.gpuCharts.colorLabel', {
            defaultMessage: 'Color',
          }),
          layerId: state.layerId,
          accessors: state.colorAccessor
            ? [{ columnId: state.colorAccessor, triggerIcon: 'colorBy' }]
            : [],
          supportsMoreColumns: !state.colorAccessor,
          filterOperations: isNumericOperation,
          required: false,
          enableDimensionEditor: true,
          dataTestSubj: 'lnsGpuCharts_colorDimensionPanel',
        },
        // Size only for scatter
        ...(isScatter3d
          ? [
              {
                groupId: GROUP_ID.SIZE,
                groupLabel: i18n.translate('xpack.lens.gpuCharts.sizeLabel', {
                  defaultMessage: 'Size',
                }),
                layerId: state.layerId,
                accessors: state.sizeAccessor
                  ? [{ columnId: state.sizeAccessor, triggerIcon: 'none' }]
                  : [],
                supportsMoreColumns: !state.sizeAccessor,
                filterOperations: isNumericOperation,
                required: false,
                dataTestSubj: 'lnsGpuCharts_sizeDimensionPanel',
              },
            ]
          : []),
        // Group for hexagon
        ...(!isScatter3d
          ? [
              {
                groupId: GROUP_ID.GROUP,
                groupLabel: i18n.translate('xpack.lens.gpuCharts.groupLabel', {
                  defaultMessage: 'Group by',
                }),
                layerId: state.layerId,
                accessors: state.groupAccessor
                  ? [{ columnId: state.groupAccessor, triggerIcon: 'none' }]
                  : [],
                supportsMoreColumns: !state.groupAccessor,
                filterOperations: isBucketedOperation,
                required: false,
                dataTestSubj: 'lnsGpuCharts_groupDimensionPanel',
              },
            ]
          : []),
      ],
    };
  },

  getSupportedLayers() {
    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.lens.gpuCharts.layerLabel', {
          defaultMessage: 'GPU visualization layer',
        }),
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return layerTypes.DATA;
    }
    return undefined;
  },

  setDimension({ prevState, columnId, groupId }) {
    switch (groupId) {
      case GROUP_ID.X:
        return { ...prevState, xAccessor: columnId };
      case GROUP_ID.Y:
        return { ...prevState, yAccessor: columnId };
      case GROUP_ID.Z:
        return { ...prevState, zAccessor: columnId };
      case GROUP_ID.COLOR:
        return { ...prevState, colorAccessor: columnId };
      case GROUP_ID.SIZE:
        return { ...prevState, sizeAccessor: columnId };
      case GROUP_ID.GROUP:
        return { ...prevState, groupAccessor: columnId };
      default:
        return prevState;
    }
  },

  removeDimension({ prevState, columnId }) {
    const newState = { ...prevState };

    if (prevState.xAccessor === columnId) {
      delete newState.xAccessor;
    }
    if (prevState.yAccessor === columnId) {
      delete newState.yAccessor;
    }
    if (prevState.zAccessor === columnId) {
      delete newState.zAccessor;
    }
    if (prevState.colorAccessor === columnId) {
      delete newState.colorAccessor;
    }
    if (prevState.sizeAccessor === columnId) {
      delete newState.sizeAccessor;
    }
    if (prevState.groupAccessor === columnId) {
      delete newState.groupAccessor;
    }

    return newState;
  },

  toExpression(state, datasourceLayers, attributes, datasourceExpressionsByLayers) {
    const datasourceExpression = datasourceExpressionsByLayers?.[state.layerId];

    if (!state.xAccessor || !state.yAccessor || !datasourceExpression) {
      return null;
    }

    return {
      type: 'expression',
      chain: [
        ...datasourceExpression.chain,
        {
          type: 'function',
          function: GPU_CHARTS_EXPRESSION,
          arguments: {
            shape: [state.shape],
            xAccessor: [state.xAccessor],
            yAccessor: [state.yAccessor],
            zAccessor: state.zAccessor ? [state.zAccessor] : [],
            colorAccessor: state.colorAccessor ? [state.colorAccessor] : [],
            sizeAccessor: state.sizeAccessor ? [state.sizeAccessor] : [],
            groupAccessor: state.groupAccessor ? [state.groupAccessor] : [],
            pointSize: [state.pointSize ?? 5],
            pointOpacity: [state.pointOpacity ?? 0.8],
            hexagonRadius: [state.hexagonRadius ?? 1000],
            hexagonElevationScale: [state.hexagonElevationScale ?? 1],
            lodTier: [state.lodTier ?? 1],
            samplingRate: [state.samplingRate ?? 1],
            cameraPosition: state.cameraPosition ? [JSON.stringify(state.cameraPosition)] : [],
            palette: state.palette ? [JSON.stringify(state.palette)] : [],
          },
        },
      ],
    } as Ast;
  },

  toPreviewExpression(state, datasourceLayers, datasourceExpressionsByLayers) {
    // Use same expression for preview, but force lower quality settings
    return this.toExpression?.(state, datasourceLayers, undefined, datasourceExpressionsByLayers);
  },

  DimensionEditorComponent(props) {
    return <GpuChartsDimensionEditor {...props} />;
  },
});
