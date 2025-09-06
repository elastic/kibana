/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IconChartTagcloud } from '@kbn/chart-icons';

export const TAGCLOUD_LABEL = i18n.translate('xpack.lens.tagcloud.label', {
  defaultMessage: 'Tag cloud',
});

export const visualizationTypes = [
  {
    id: 'lnsTagcloud',
    icon: IconChartTagcloud,
    label: TAGCLOUD_LABEL,
    sortPriority: 12,
    description: i18n.translate('xpack.lens.tagcloud.visualizationDescription', {
      defaultMessage: 'Visualize text data frequency or importance.',
    }),
  },
];
