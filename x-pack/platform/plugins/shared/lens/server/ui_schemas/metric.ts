/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UISchemaEntry } from './types';

export const metricUISchema: UISchemaEntry[] = [
  {
    path: 'styling.primary.position',
    label: i18n.translate('xpack.lens.metric.appearancePopover.position', {
      defaultMessage: 'Position',
    }),
    widget: 'buttonGroup',
  },
  {
    path: 'styling.primary.value.alignment',
    label: i18n.translate('xpack.lens.metric.appearancePopover.valueAlignment', {
      defaultMessage: 'Value alignment',
    }),
    widget: 'buttonGroup',
  },
  {
    path: 'styling.primary.value.sizing',
    label: i18n.translate('xpack.lens.metric.appearancePopover.fontSize', {
      defaultMessage: 'Font size',
    }),
    widget: 'buttonGroup',
  },
  {
    path: 'styling.primary.labels.alignment',
    label: i18n.translate('xpack.lens.metric.appearancePopover.labelsAlignment', {
      defaultMessage: 'Labels alignment',
    }),
    widget: 'buttonGroup',
  },
  {
    path: 'styling.secondary.value.alignment',
    label: i18n.translate('xpack.lens.metric.appearancePopover.secondaryAlignment', {
      defaultMessage: 'Secondary value alignment',
    }),
    widget: 'buttonGroup',
  },
  {
    path: 'styling.icon.name',
    label: i18n.translate('xpack.lens.metric.icon', {
      defaultMessage: 'Icon',
    }),
  },
  {
    path: 'styling.icon.alignment',
    label: i18n.translate('xpack.lens.metric.appearancePopover.iconPosition', {
      defaultMessage: 'Icon position',
    }),
    widget: 'buttonGroup',
  },
];
