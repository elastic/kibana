/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { EuiHealth, useEuiTheme } from '@elastic/eui';

import {
  getDataSourceConnectionStatusColor,
  getMockDataSourceConnectionStatus,
  type DataSourceConnectionStatus,
} from './data_source_connection_status';
import { mainTranslations } from './main_i18n';

const getStatusSemanticColor = (
  status: DataSourceConnectionStatus,
  colors: ReturnType<typeof useEuiTheme>['euiTheme']['colors']
) => (status === 'connected' ? colors.success : colors.danger);

const getPreserveStatusColorsInSelectableCss = (
  status: DataSourceConnectionStatus,
  colors: ReturnType<typeof useEuiTheme>['euiTheme']['colors']
) => {
  const semanticColor = getStatusSemanticColor(status, colors);

  return css`
    li[aria-selected='true'] &,
    li[aria-checked='true'] & {
      color: ${colors.textParagraph} !important;

      .euiIcon {
        color: ${semanticColor} !important;
      }
    }
  `;
};

export interface DataSourceConnectionStatusHealthProps {
  dataSourceName: string;
  'data-test-subj'?: string;
}

export const DataSourceConnectionStatusHealth: FunctionComponent<
  DataSourceConnectionStatusHealthProps
> = ({ dataSourceName, 'data-test-subj': dataTestSubj = 'dataSourceConnectionStatus' }) => {
  const { euiTheme } = useEuiTheme();
  const status = getMockDataSourceConnectionStatus(dataSourceName);

  return (
    <EuiHealth
      color={getDataSourceConnectionStatusColor(status)}
      css={getPreserveStatusColorsInSelectableCss(status, euiTheme.colors)}
      data-test-subj={dataTestSubj}
    >
      {status === 'connected'
        ? mainTranslations.columns.dataSources.connectionStatusConnected
        : mainTranslations.columns.dataSources.connectionStatusBroken}
    </EuiHealth>
  );
};
