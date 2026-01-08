/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  Datatable,
  ExpressionFunctionDefinition,
  ExpressionValueRender,
} from '@kbn/expressions-plugin/common';
import type { GpuChartsExpressionArgs, LodTier } from './types';
import type { GpuChartShape } from './constants';
import { GPU_CHARTS_EXPRESSION, GPU_CHARTS_RENDERER } from './constants';

export interface GpuChartsExpressionProps {
  data: Datatable;
  args: GpuChartsExpressionArgs;
}

export const gpuChartsExpressionFunction: ExpressionFunctionDefinition<
  typeof GPU_CHARTS_EXPRESSION,
  Datatable,
  GpuChartsExpressionArgs,
  ExpressionValueRender<GpuChartsExpressionProps>
> = {
  name: GPU_CHARTS_EXPRESSION,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('xpack.lens.gpuCharts.expressionHelp', {
    defaultMessage: 'GPU-accelerated chart visualization for high-cardinality data',
  }),
  args: {
    shape: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gpuCharts.shape.help', {
        defaultMessage: 'Chart shape type (scatter3d or hexagon)',
      }),
      required: true,
    },
    xAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gpuCharts.xAccessor.help', {
        defaultMessage: 'Column ID for X axis values',
      }),
      required: true,
    },
    yAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gpuCharts.yAccessor.help', {
        defaultMessage: 'Column ID for Y axis values',
      }),
      required: true,
    },
    zAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gpuCharts.zAccessor.help', {
        defaultMessage: 'Column ID for Z axis values (3D scatter only)',
      }),
      required: false,
    },
    colorAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gpuCharts.colorAccessor.help', {
        defaultMessage: 'Column ID for color values',
      }),
      required: false,
    },
    sizeAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gpuCharts.sizeAccessor.help', {
        defaultMessage: 'Column ID for size values',
      }),
      required: false,
    },
    groupAccessor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gpuCharts.groupAccessor.help', {
        defaultMessage: 'Column ID for group values',
      }),
      required: false,
    },
    pointSize: {
      types: ['number'],
      help: i18n.translate('xpack.lens.gpuCharts.pointSize.help', {
        defaultMessage: 'Base point size in pixels',
      }),
      default: 5,
    },
    pointOpacity: {
      types: ['number'],
      help: i18n.translate('xpack.lens.gpuCharts.pointOpacity.help', {
        defaultMessage: 'Point opacity (0-1)',
      }),
      default: 0.8,
    },
    hexagonRadius: {
      types: ['number'],
      help: i18n.translate('xpack.lens.gpuCharts.hexagonRadius.help', {
        defaultMessage: 'Hexagon bin radius',
      }),
      default: 1000,
    },
    hexagonElevationScale: {
      types: ['number'],
      help: i18n.translate('xpack.lens.gpuCharts.hexagonElevationScale.help', {
        defaultMessage: 'Hexagon elevation scale factor',
      }),
      default: 1,
    },
    lodTier: {
      types: ['number'],
      help: i18n.translate('xpack.lens.gpuCharts.lodTier.help', {
        defaultMessage: 'Level of detail tier (1-4)',
      }),
      default: 1,
    },
    samplingRate: {
      types: ['number'],
      help: i18n.translate('xpack.lens.gpuCharts.samplingRate.help', {
        defaultMessage: 'Data sampling rate (0-1)',
      }),
      default: 1,
    },
    totalDataPoints: {
      types: ['number'],
      help: i18n.translate('xpack.lens.gpuCharts.totalDataPoints.help', {
        defaultMessage: 'Total data points before sampling',
      }),
      default: 0,
    },
    cameraPosition: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gpuCharts.cameraPosition.help', {
        defaultMessage: 'Camera position as JSON (3D scatter only)',
      }),
      required: false,
    },
    palette: {
      types: ['string'],
      help: i18n.translate('xpack.lens.gpuCharts.palette.help', {
        defaultMessage: 'Color palette configuration as JSON',
      }),
      required: false,
    },
  },
  fn(data, args) {
    return {
      type: 'render',
      as: GPU_CHARTS_RENDERER,
      value: {
        data,
        args: {
          ...args,
          shape: args.shape as GpuChartShape,
          lodTier: (args.lodTier || 1) as LodTier,
          samplingRate: args.samplingRate || 1,
          totalDataPoints: args.totalDataPoints || data.rows.length,
        },
      },
    };
  },
};
