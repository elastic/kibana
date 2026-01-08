/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LENS_GPU_CHARTS_ID = 'lnsGpuCharts';
export const GPU_SCATTER_3D_ID = 'gpuScatter3d';
export const GPU_HEXAGON_ID = 'gpuHexagon';

export const GPU_CHARTS_RENDERER = 'lens_gpu_charts_renderer';
export const GPU_CHARTS_EXPRESSION = 'lens_gpu_charts';

export const CHART_SHAPES = {
  SCATTER_3D: 'scatter3d',
  HEXAGON: 'hexagon',
} as const;

export type GpuChartShape = (typeof CHART_SHAPES)[keyof typeof CHART_SHAPES];

export const CHART_NAMES = {
  scatter3d: {
    shapeType: CHART_SHAPES.SCATTER_3D,
    icon: 'visScatter' as const,
    label: i18n.translate('xpack.lens.gpuCharts.scatter3dLabel', {
      defaultMessage: '3D Scatter Plot',
    }),
    description: i18n.translate('xpack.lens.gpuCharts.scatter3dDescription', {
      defaultMessage: 'Visualize high-cardinality data in three dimensions using GPU acceleration.',
    }),
  },
  hexagon: {
    shapeType: CHART_SHAPES.HEXAGON,
    icon: 'heatmap' as const,
    label: i18n.translate('xpack.lens.gpuCharts.hexagonLabel', {
      defaultMessage: 'Hexagonal Density',
    }),
    description: i18n.translate('xpack.lens.gpuCharts.hexagonDescription', {
      defaultMessage:
        'Visualize density distribution using hexagonal binning with GPU acceleration.',
    }),
  },
};

export const GROUP_ID = {
  X: 'x',
  Y: 'y',
  Z: 'z',
  COLOR: 'color',
  SIZE: 'size',
  GROUP: 'group',
} as const;

/**
 * LOD (Level of Detail) tier thresholds for data rendering
 */
export const LOD_THRESHOLDS = {
  /** Full render - no sampling */
  TIER_1_MAX: 100_000,
  /** Client-side decimation */
  TIER_2_MAX: 500_000,
  /** Server-side sampling */
  TIER_3_MAX: 5_000_000,
  /** Above this: tile-based loading */
} as const;

/**
 * Default sampling rates for each LOD tier
 */
export const DEFAULT_SAMPLING_RATES = {
  TIER_2: 0.2, // 20% for client-side decimation
  TIER_3: 0.02, // 2% for server-side sampling
} as const;

/**
 * GPU memory and rendering limits
 */
export const GPU_LIMITS = {
  /** Maximum points to render at once */
  MAX_RENDER_POINTS: 100_000,
  /** Target points after any sampling */
  TARGET_RENDER_POINTS: 50_000,
} as const;
