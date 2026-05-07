/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UISchemaEntry } from './types';

export const heatmapUISchema: UISchemaEntry[] = [
  // Style section
  {
    path: 'styling.cells.labels.visible',
    label: i18n.translate('xpack.lens.heatmap.cellLabelsLabel', {
      defaultMessage: 'Show cell labels',
    }),
  },
  {
    path: 'axis.x.labels.visible',
    label: i18n.translate('xpack.lens.heatmap.xAxisLabelsVisibleLabel', {
      defaultMessage: 'Show X axis labels',
    }),
  },
  {
    path: 'axis.x.labels.orientation',
    label: i18n.translate('xpack.lens.heatmap.xAxisLabelsOrientationLabel', {
      defaultMessage: 'X axis label orientation',
    }),
    widget: 'buttonGroup',
  },
  {
    path: 'axis.x.title.visible',
    label: i18n.translate('xpack.lens.heatmap.xAxisTitleVisibleLabel', {
      defaultMessage: 'Show X axis title',
    }),
  },
  {
    path: 'axis.x.title.text',
    label: i18n.translate('xpack.lens.heatmap.xAxisTitleLabel', {
      defaultMessage: 'X axis title',
    }),
  },
  {
    path: 'axis.y.labels.visible',
    label: i18n.translate('xpack.lens.heatmap.yAxisLabelsVisibleLabel', {
      defaultMessage: 'Show Y axis labels',
    }),
  },
  {
    path: 'axis.y.title.visible',
    label: i18n.translate('xpack.lens.heatmap.yAxisTitleVisibleLabel', {
      defaultMessage: 'Show Y axis title',
    }),
  },
  {
    path: 'axis.y.title.text',
    label: i18n.translate('xpack.lens.heatmap.yAxisTitleLabel', {
      defaultMessage: 'Y axis title',
    }),
  },
  // Legend section
  {
    path: 'legend.visibility',
    label: i18n.translate('xpack.lens.heatmap.legendVisibilityLabel', {
      defaultMessage: 'Legend visibility',
    }),
    widget: 'buttonGroup',
  },
  {
    path: 'legend.position',
    label: i18n.translate('xpack.lens.heatmap.legendPositionLabel', {
      defaultMessage: 'Legend position',
    }),
    widget: 'buttonGroup',
  },
  {
    path: 'legend.size',
    label: i18n.translate('xpack.lens.heatmap.legendSizeLabel', {
      defaultMessage: 'Legend size',
    }),
  },
  {
    path: 'legend.truncate_after_lines',
    label: i18n.translate('xpack.lens.heatmap.legendTruncateLabel', {
      defaultMessage: 'Truncate legend after lines',
    }),
  },
];
