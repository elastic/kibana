/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GaugeShapes } from '@kbn/expression-gauge-plugin/common';
import { IconChartGauge } from '@kbn/chart-icons';

export const LENS_GAUGE_ID = 'lnsGauge';

export const visualizationTypes = [
  {
    id: LENS_GAUGE_ID,
    icon: IconChartGauge,
    label: i18n.translate('xpack.lens.gauge.label', {
      defaultMessage: 'Gauge',
    }),
    sortPriority: 7,
    description: i18n.translate('xpack.lens.gauge.visualizationDescription', {
      defaultMessage: 'Show progress to a goal in linear or arced style.',
    }),
    subtypes: [
      GaugeShapes.HORIZONTAL_BULLET,
      GaugeShapes.VERTICAL_BULLET,
      GaugeShapes.SEMI_CIRCLE,
      GaugeShapes.ARC,
      GaugeShapes.CIRCLE,
    ],
  },
];
