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
  },
  // Style section — donut hole (pie/donut specific)
  {
    path: 'styling.donut_hole',
    label: i18n.translate('xpack.lens.pie.donutHoleLabel', {
      defaultMessage: 'Inner area size',
    }),
    widget: 'buttonGroup',
  },
  // Legend section
  {
    path: 'legend.visibility',
    label: i18n.translate('xpack.lens.pie.legendVisibilityLabel', {
      defaultMessage: 'Legend visibility',
    }),
    widget: 'buttonGroup',
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
  },
  {
    path: 'legend.truncate_after_lines',
    label: i18n.translate('xpack.lens.pie.legendTruncateLabel', {
      defaultMessage: 'Max legend lines',
    }),
  },
];
