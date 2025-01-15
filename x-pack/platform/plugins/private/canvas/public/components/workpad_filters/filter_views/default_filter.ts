/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FilterViewSpec } from '../../../../types';
import { formatByKey } from '../utils';

const strings = {
  getTypeLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.defaultFilter.type', {
      defaultMessage: 'Type',
    }),
  getColumnLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.defaultFilter.column', {
      defaultMessage: 'Column',
    }),
  getFilterGroupLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.defaultFilter.filterGroup', {
      defaultMessage: 'Filter group',
    }),
  getValueLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.defaultFilter.value', {
      defaultMessage: 'Value',
    }),
};

export const defaultFilter: FilterViewSpec = {
  name: 'default',
  view: {
    column: { label: strings.getColumnLabel() },
    value: { label: strings.getValueLabel() },
    type: { label: strings.getTypeLabel(), formatter: formatByKey('type') },
    filterGroup: { label: strings.getFilterGroupLabel() },
  },
};
