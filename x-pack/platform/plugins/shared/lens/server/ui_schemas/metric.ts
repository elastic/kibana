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
    options: [
      {
        value: 'top',
        label: i18n.translate('xpack.lens.metric.positionTop', { defaultMessage: 'Top' }),
      },
      {
        value: 'middle',
        label: i18n.translate('xpack.lens.metric.positionMiddle', { defaultMessage: 'Middle' }),
      },
      {
        value: 'bottom',
        label: i18n.translate('xpack.lens.metric.positionBottom', { defaultMessage: 'Bottom' }),
      },
    ],
  },
  {
    path: 'styling.primary.value.alignment',
    label: i18n.translate('xpack.lens.metric.appearancePopover.valueAlignment', {
      defaultMessage: 'Value alignment',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'left',
        label: i18n.translate('xpack.lens.metric.alignmentLeft', { defaultMessage: 'Left' }),
      },
      {
        value: 'center',
        label: i18n.translate('xpack.lens.metric.alignmentCenter', { defaultMessage: 'Center' }),
      },
      {
        value: 'right',
        label: i18n.translate('xpack.lens.metric.alignmentRight', { defaultMessage: 'Right' }),
      },
    ],
  },
  {
    path: 'styling.primary.value.sizing',
    label: i18n.translate('xpack.lens.metric.appearancePopover.fontSize', {
      defaultMessage: 'Font size',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'auto',
        label: i18n.translate('xpack.lens.metric.sizingAuto', { defaultMessage: 'Auto' }),
      },
      {
        value: 'fill',
        label: i18n.translate('xpack.lens.metric.sizingFill', { defaultMessage: 'Fill' }),
      },
    ],
  },
  {
    path: 'styling.primary.labels.alignment',
    label: i18n.translate('xpack.lens.metric.appearancePopover.labelsAlignment', {
      defaultMessage: 'Labels alignment',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'left',
        label: i18n.translate('xpack.lens.metric.labelsAlignmentLeft', { defaultMessage: 'Left' }),
      },
      {
        value: 'center',
        label: i18n.translate('xpack.lens.metric.labelsAlignmentCenter', {
          defaultMessage: 'Center',
        }),
      },
      {
        value: 'right',
        label: i18n.translate('xpack.lens.metric.labelsAlignmentRight', {
          defaultMessage: 'Right',
        }),
      },
    ],
  },
  {
    path: 'styling.secondary.value.alignment',
    label: i18n.translate('xpack.lens.metric.appearancePopover.secondaryAlignment', {
      defaultMessage: 'Secondary value alignment',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'left',
        label: i18n.translate('xpack.lens.metric.secondaryAlignmentLeft', {
          defaultMessage: 'Left',
        }),
      },
      {
        value: 'center',
        label: i18n.translate('xpack.lens.metric.secondaryAlignmentCenter', {
          defaultMessage: 'Center',
        }),
      },
      {
        value: 'right',
        label: i18n.translate('xpack.lens.metric.secondaryAlignmentRight', {
          defaultMessage: 'Right',
        }),
      },
    ],
  },
  {
    path: 'styling.icon.name',
    label: i18n.translate('xpack.lens.metric.icon', {
      defaultMessage: 'Icon decoration',
    }),
  },
  {
    path: 'styling.icon.alignment',
    label: i18n.translate('xpack.lens.metric.appearancePopover.iconPosition', {
      defaultMessage: 'Icon position',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'left',
        label: i18n.translate('xpack.lens.metric.iconAlignmentLeft', { defaultMessage: 'Left' }),
      },
      {
        value: 'right',
        label: i18n.translate('xpack.lens.metric.iconAlignmentRight', { defaultMessage: 'Right' }),
      },
    ],
  },
];
