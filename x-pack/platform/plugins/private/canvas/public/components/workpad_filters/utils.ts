/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FilterField } from '../../../types';

const strings = {
  getBlankLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.filter.blankTypeLabel', {
      defaultMessage: '(Blank)',
    }),
  getExactlyFilterTypeLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.defaultFilter.typeLabel', {
      defaultMessage: 'Dropdown',
    }),
  getTimeFilterTypeLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.timeFilter.typeLabel', {
      defaultMessage: 'Time',
    }),
  getWithoutGroupLabel: () =>
    i18n.translate('xpack.canvas.workpadFilters.filters_group.withoutGroup', {
      defaultMessage: 'Without group',
    }),
};

const formatType = (type: unknown) => {
  const types: Record<string, string> = {
    exactly: strings.getExactlyFilterTypeLabel(),
    time: strings.getTimeFilterTypeLabel(),
  };
  return typeof type === 'string' ? types[type] ?? type : null;
};

const formatters: Partial<Record<FilterField, (value?: unknown) => string | null>> = {
  type: formatType,
};

export const formatByKey = (key: FilterField) => formatters[key];
