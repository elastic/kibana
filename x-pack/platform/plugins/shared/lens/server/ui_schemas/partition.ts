/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UISchemaEntry } from './types';

export const partitionUISchema: UISchemaEntry[] = [
  // Style section — value display
  {
    path: 'styling.values.visible',
    label: i18n.translate('xpack.lens.pie.valuesVisibleLabel', {
      defaultMessage: 'Show values',
    }),
  },
  {
    path: 'styling.values.mode',
    label: i18n.translate('xpack.lens.pie.valuesModeLabel', {
      defaultMessage: 'Value format',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'absolute',
        label: i18n.translate('xpack.lens.pie.valuesModeAbsolute', { defaultMessage: 'Value' }),
      },
      {
        value: 'percentage',
        label: i18n.translate('xpack.lens.pie.valuesModePercentage', {
          defaultMessage: 'Percent',
        }),
      },
    ],
  },
  {
    path: 'styling.values.percent_decimals',
    label: i18n.translate('xpack.lens.pie.percentDecimalsLabel', {
      defaultMessage: 'Decimal places',
    }),
  },
  // Style section — labels (pie/donut specific)
  {
    path: 'styling.labels.visible',
    label: i18n.translate('xpack.lens.pie.labelsVisibleLabel', {
      defaultMessage: 'Show labels',
    }),
  },
  {
    path: 'styling.labels.position',
    label: i18n.translate('xpack.lens.pie.labelsPositionLabel', {
      defaultMessage: 'Label position',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'inside',
        label: i18n.translate('xpack.lens.pie.labelsPositionInside', {
          defaultMessage: 'Inside',
        }),
      },
      {
        value: 'outside',
        label: i18n.translate('xpack.lens.pie.labelsPositionOutside', {
          defaultMessage: 'Outside',
        }),
      },
    ],
  },
  // Style section — donut hole (pie/donut specific)
  {
    path: 'styling.donut_hole',
    label: i18n.translate('xpack.lens.pie.donutHoleLabel', {
      defaultMessage: 'Inner area size',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'none',
        label: i18n.translate('xpack.lens.pie.donutHoleNone', { defaultMessage: 'None' }),
      },
      {
        value: 's',
        label: i18n.translate('xpack.lens.pie.donutHoleSmall', { defaultMessage: 'Small' }),
      },
      {
        value: 'm',
        label: i18n.translate('xpack.lens.pie.donutHoleMedium', { defaultMessage: 'Medium' }),
      },
      {
        value: 'l',
        label: i18n.translate('xpack.lens.pie.donutHoleLarge', { defaultMessage: 'Large' }),
      },
    ],
  },
  // Legend section
  {
    path: 'legend.visibility',
    label: i18n.translate('xpack.lens.pie.legendVisibilityLabel', {
      defaultMessage: 'Legend visibility',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'auto',
        label: i18n.translate('xpack.lens.pie.legendVisibilityAuto', { defaultMessage: 'Auto' }),
      },
      {
        value: 'visible',
        label: i18n.translate('xpack.lens.pie.legendVisibilityShow', { defaultMessage: 'Show' }),
      },
      {
        value: 'hidden',
        label: i18n.translate('xpack.lens.pie.legendVisibilityHide', { defaultMessage: 'Hide' }),
      },
    ],
  },
  {
    path: 'legend.nested',
    label: i18n.translate('xpack.lens.pie.nestedLegendLabel', {
      defaultMessage: 'Nested legend',
    }),
  },
  {
    path: 'legend.size',
    label: i18n.translate('xpack.lens.pie.legendSizeLabel', {
      defaultMessage: 'Legend size',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'auto',
        label: i18n.translate('xpack.lens.pie.legendSizeAuto', { defaultMessage: 'Auto' }),
      },
      {
        value: 's',
        label: i18n.translate('xpack.lens.pie.legendSizeSmall', { defaultMessage: 'Small' }),
      },
      {
        value: 'm',
        label: i18n.translate('xpack.lens.pie.legendSizeMedium', { defaultMessage: 'Medium' }),
      },
      {
        value: 'l',
        label: i18n.translate('xpack.lens.pie.legendSizeLarge', { defaultMessage: 'Large' }),
      },
      {
        value: 'xl',
        label: i18n.translate('xpack.lens.pie.legendSizeExtraLarge', {
          defaultMessage: 'Extra large',
        }),
      },
    ],
  },
  {
    path: 'legend.truncate_after_lines',
    label: i18n.translate('xpack.lens.pie.legendTruncateLabel', {
      defaultMessage: 'Max legend lines',
    }),
  },
];
