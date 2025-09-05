/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IconChartHeatmap } from '@kbn/chart-icons';

export const visualizationTypes = [
  {
    id: 'heatmap',
    icon: IconChartHeatmap,
    label: i18n.translate('xpack.lens.heatmapVisualization.heatmapLabel', {
      defaultMessage: 'Heat map',
    }),
    sortPriority: 8,
    description: i18n.translate('xpack.lens.heatmap.visualizationDescription', {
      defaultMessage: 'Show density or distribution across two dimensions.',
    }),
  },
];
