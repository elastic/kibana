/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UISchemaEntry } from './types';

export const tagcloudUISchema: UISchemaEntry[] = [
  {
    path: 'styling.orientation',
    label: i18n.translate('xpack.lens.label.tagcloud.orientationLabel', {
      defaultMessage: 'Orientation',
    }),
    widget: 'buttonGroup',
    options: [
      {
        value: 'horizontal',
        label: i18n.translate('xpack.lens.tagcloud.orientationHorizontal', {
          defaultMessage: 'Horizontal',
        }),
      },
      {
        value: 'vertical',
        label: i18n.translate('xpack.lens.tagcloud.orientationVertical', {
          defaultMessage: 'Vertical',
        }),
      },
      {
        value: 'angled',
        label: i18n.translate('xpack.lens.tagcloud.orientationAngled', {
          defaultMessage: 'Angled',
        }),
      },
    ],
  },
  {
    path: 'styling.font_size.min',
    label: i18n.translate('xpack.lens.label.tagcloud.minFontSizeLabel', {
      defaultMessage: 'Minimum font size',
    }),
  },
  {
    path: 'styling.font_size.max',
    label: i18n.translate('xpack.lens.label.tagcloud.maxFontSizeLabel', {
      defaultMessage: 'Maximum font size',
    }),
  },
  {
    path: 'styling.caption.visible',
    label: i18n.translate('xpack.lens.label.tagcloud.showLabel', {
      defaultMessage: 'Show label',
    }),
  },
];
