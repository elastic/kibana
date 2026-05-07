/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UISchemaEntry } from './types';

export const datatableUISchema: UISchemaEntry[] = [
  {
    path: 'styling.density.mode',
    label: i18n.translate('xpack.lens.table.densityLabel', { defaultMessage: 'Density' }),
    widget: 'buttonGroup',
  },
  {
    path: 'styling.density.height.header',
    label: i18n.translate('xpack.lens.table.headerRowHeightLabel', {
      defaultMessage: 'Max header cell lines',
    }),
    widget: 'rowHeight',
    props: { maxLines: 5 },
  },
  {
    path: 'styling.density.height.value',
    label: i18n.translate('xpack.lens.table.bodyCellLinesLabel', {
      defaultMessage: 'Body cell lines',
    }),
    widget: 'rowHeight',
  },
  {
    path: 'styling.paging',
    label: i18n.translate('xpack.lens.table.paginateTableLabel', {
      defaultMessage: 'Paginate table',
    }),
    widget: 'paginationToggle',
    tooltip: i18n.translate('xpack.lens.table.paginateTableTooltip', {
      defaultMessage: 'Pagination is hidden if there are less than 10 items',
    }),
  },
  {
    path: 'styling.row_numbers.visible',
    label: i18n.translate('xpack.lens.table.showRowNumbersLabel', {
      defaultMessage: 'Show row numbers',
    }),
  },
];
