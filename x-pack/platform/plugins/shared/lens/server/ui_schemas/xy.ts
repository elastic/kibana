/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UISchemaEntry } from './types';

export const xyUISchema: UISchemaEntry[] = [
  // Legend
  {
    path: 'legend.visibility',
    label: i18n.translate('xpack.lens.xy.legendVisibilityLabel', {
      defaultMessage: 'Legend visibility',
    }),
    widget: 'buttonGroup',
  },
  {
    path: 'legend.position',
    label: i18n.translate('xpack.lens.xy.legendPositionLabel', {
      defaultMessage: 'Legend position',
    }),
    widget: 'buttonGroup',
  },
  // Styling — overlays
  {
    path: 'styling.overlays.partial_buckets.visible',
    label: i18n.translate('xpack.lens.xy.showPartialBucketsLabel', {
      defaultMessage: 'Show partial buckets',
    }),
  },
  {
    path: 'styling.overlays.current_time_marker.visible',
    label: i18n.translate('xpack.lens.xy.showCurrentTimeMarkerLabel', {
      defaultMessage: 'Show current time marker',
    }),
  },
  // Styling — line/area interpolation
  {
    path: 'styling.interpolation',
    label: i18n.translate('xpack.lens.xy.interpolationLabel', {
      defaultMessage: 'Line interpolation',
    }),
    widget: 'buttonGroup',
  },
  // Styling — points
  {
    path: 'styling.points.visibility',
    label: i18n.translate('xpack.lens.xy.pointsVisibilityLabel', {
      defaultMessage: 'Points visibility',
    }),
    widget: 'buttonGroup',
  },
  // Styling — areas
  {
    path: 'styling.areas.fill_opacity',
    label: i18n.translate('xpack.lens.xy.areaFillOpacityLabel', {
      defaultMessage: 'Area fill opacity',
    }),
  },
  // Styling — bars
  {
    path: 'styling.bars.data_labels.visible',
    label: i18n.translate('xpack.lens.xy.barDataLabelsLabel', {
      defaultMessage: 'Show bar data labels',
    }),
  },
  // Styling — fitting
  {
    path: 'styling.fitting.type',
    label: i18n.translate('xpack.lens.xy.fittingTypeLabel', {
      defaultMessage: 'Missing values',
    }),
    widget: 'buttonGroup',
  },
];
