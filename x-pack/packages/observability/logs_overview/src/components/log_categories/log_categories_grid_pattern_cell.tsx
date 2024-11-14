/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { LogCategory } from '../../types';
import { LogCategoryPattern } from '../shared/log_category_pattern';

export const logCategoriesGridPatternColumn = {
  id: 'pattern' as const,
  display: i18n.translate('xpack.observabilityLogsOverview.logCategoriesGrid.patternColumnLabel', {
    defaultMessage: 'Pattern',
  }),
  isSortable: false,
  schema: 'string',
} satisfies EuiDataGridColumn;

export interface LogCategoriesGridPatternCellProps {
  logCategory: LogCategory;
}

export const LogCategoriesGridPatternCell: React.FC<LogCategoriesGridPatternCellProps> = ({
  logCategory,
}) => {
  return <LogCategoryPattern logCategory={logCategory} />;
};
