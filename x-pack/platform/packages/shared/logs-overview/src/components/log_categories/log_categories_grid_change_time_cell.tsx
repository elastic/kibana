/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { SettingsStart } from '@kbn/core-ui-settings-browser';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useMemo } from 'react';
import { LogCategory } from '../../types';

export const logCategoriesGridChangeTimeColumn = {
  id: 'change_time' as const,
  display: i18n.translate(
    'xpack.observabilityLogsOverview.logCategoriesGrid.changeTimeColumnLabel',
    {
      defaultMessage: 'Change at',
    }
  ),
  isSortable: true,
  initialWidth: 220,
  schema: 'datetime',
} satisfies EuiDataGridColumn;

export interface LogCategoriesGridChangeTimeCellProps {
  dependencies: LogCategoriesGridChangeTimeCellDependencies;
  logCategory: LogCategory;
}

export interface LogCategoriesGridChangeTimeCellDependencies {
  uiSettings: SettingsStart;
}

export const LogCategoriesGridChangeTimeCell: React.FC<LogCategoriesGridChangeTimeCellProps> = ({
  dependencies,
  logCategory,
}) => {
  const dateFormat = useMemo(
    () => dependencies.uiSettings.client.get('dateFormat'),
    [dependencies.uiSettings.client]
  );
  if (!('timestamp' in logCategory.change && logCategory.change.timestamp != null)) {
    return null;
  }

  if (dateFormat) {
    return <>{moment(logCategory.change.timestamp).format(dateFormat)}</>;
  } else {
    return <>{logCategory.change.timestamp}</>;
  }
};
