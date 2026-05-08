/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import type {
  PrimaryMetricFontSize,
  IconPosition,
  Alignment,
  PrimaryMetricPosition,
} from '@kbn/lens-common';
import { i18n } from '@kbn/i18n';

export const alignmentOptions: Array<EuiButtonGroupOptionProps & { id: Alignment }> = [
  {
    id: 'left',
    label: i18n.translate('xpack.lens.shared.left', { defaultMessage: 'Left' }),
    iconType: 'textAlignLeft',
  },
  {
    id: 'center',
    label: i18n.translate('xpack.lens.shared.center', { defaultMessage: 'Center' }),
    iconType: 'textAlignCenter',
  },
  {
    id: 'right',
    label: i18n.translate('xpack.lens.shared.right', { defaultMessage: 'Right' }),
    iconType: 'textAlignRight',
  },
];

export const iconPositionOptions: Array<EuiButtonGroupOptionProps & { id: IconPosition }> = [
  {
    id: 'left',
    label: i18n.translate('xpack.lens.shared.left', { defaultMessage: 'Left' }),
  },
  {
    id: 'right',
    label: i18n.translate('xpack.lens.shared.right', { defaultMessage: 'Right' }),
  },
];

export const fontSizeOptions: Array<EuiButtonGroupOptionProps & { id: PrimaryMetricFontSize }> = [
  {
    id: 'default',
    label: i18n.translate('xpack.lens.metric.appearancePopover.default', {
      defaultMessage: 'Default',
    }),
  },
  {
    id: 'fit',
    label: i18n.translate('xpack.lens.metric.appearancePopover.fit', { defaultMessage: 'Fit' }),
  },
];

export const primaryMetricPositionOptions: Array<
  EuiButtonGroupOptionProps & { id: PrimaryMetricPosition }
> = [
  {
    id: 'top',
    label: i18n.translate('xpack.lens.metric.appearancePopover.top', { defaultMessage: 'Top' }),
  },
  {
    id: 'middle',
    label: i18n.translate('xpack.lens.metric.appearancePopover.middle', {
      defaultMessage: 'Middle',
    }),
  },
  {
    id: 'bottom',
    label: i18n.translate('xpack.lens.metric.appearancePopover.bottom', {
      defaultMessage: 'Bottom',
    }),
  },
];
