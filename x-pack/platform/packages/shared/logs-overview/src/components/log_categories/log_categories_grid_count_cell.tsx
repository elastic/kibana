/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedNumber } from '@kbn/i18n-react';
import React from 'react';
import { LogCategory } from '../../types';

export const logCategoriesGridCountColumn = {
  id: 'count' as const,
  display: i18n.translate('xpack.observabilityLogsOverview.logCategoriesGrid.countColumnLabel', {
    defaultMessage: 'Events',
  }),
  isSortable: true,
  schema: 'numeric',
  initialWidth: 100,
} satisfies EuiDataGridColumn;

export interface LogCategoriesGridCountCellProps {
  logCategory: LogCategory;
}

export const LogCategoriesGridCountCell: React.FC<LogCategoriesGridCountCellProps> = ({
  logCategory,
}) => {
  return <FormattedNumber value={logCategory.documentCount} />;
};
