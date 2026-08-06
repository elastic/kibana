/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiHealth } from '@elastic/eui';

import {
  getDataSourceConnectionStatusColor,
  getMockDataSourceConnectionStatus,
} from './data_source_connection_status';
import { mainTranslations } from './main_i18n';

export interface DataSourceConnectionStatusHealthProps {
  dataSourceName: string;
  'data-test-subj'?: string;
}

export const DataSourceConnectionStatusHealth: FunctionComponent<
  DataSourceConnectionStatusHealthProps
> = ({ dataSourceName, 'data-test-subj': dataTestSubj = 'dataSourceConnectionStatus' }) => {
  const status = getMockDataSourceConnectionStatus(dataSourceName);

  return (
    <EuiHealth color={getDataSourceConnectionStatusColor(status)} data-test-subj={dataTestSubj}>
      {status === 'connected'
        ? mainTranslations.columns.dataSources.connectionStatusConnected
        : mainTranslations.columns.dataSources.connectionStatusBroken}
    </EuiHealth>
  );
};
