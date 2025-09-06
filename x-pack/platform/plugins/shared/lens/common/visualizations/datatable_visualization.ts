/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IconChartDatatable } from '@kbn/chart-icons';

export const visualizationLabel = i18n.translate('xpack.lens.datatable.label', {
  defaultMessage: 'Table',
});

export const visualizationTypes = [
  {
    id: 'lnsDatatable',
    icon: IconChartDatatable,
    label: visualizationLabel,
    sortPriority: 5,
    description: i18n.translate('xpack.lens.datatable.visualizationDescription', {
      defaultMessage: 'Organize data in structured rows and columns.',
    }),
  },
];
