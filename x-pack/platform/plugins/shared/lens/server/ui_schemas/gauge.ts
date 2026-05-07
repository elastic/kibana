/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UISchemaEntry } from './types';

export const gaugeUISchema: UISchemaEntry[] = [
  {
    path: 'styling.shape.type',
    label: i18n.translate('xpack.lens.gauge.shapeLabel', {
      defaultMessage: 'Shape',
    }),
    widget: 'buttonGroup',
  },
  {
    path: 'styling.shape.orientation',
    label: i18n.translate('xpack.lens.gauge.orientationLabel', {
      defaultMessage: 'Orientation',
    }),
    widget: 'buttonGroup',
  },
];
