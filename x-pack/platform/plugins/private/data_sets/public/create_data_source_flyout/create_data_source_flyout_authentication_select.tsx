/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFormRow, EuiSelect, EuiSpacer, useEuiTheme } from '@elastic/eui';

import type { DataSourceType } from '../../common/datasource_types';
import {
  createDataSourceFlyoutAuthenticationLabel,
  DATA_SOURCE_TYPES_WITH_AUTHENTICATION,
  getCreateDataSourceAuthenticationOptions,
  type CreateDataSourceAuthenticationMode,
} from './create_data_source_flyout_authentication';

export function CreateDataSourceFlyoutAuthenticationSelect({
  dataSourceType,
  authenticationMode,
  onAuthenticationModeChange,
}: {
  dataSourceType: DataSourceType;
  authenticationMode: CreateDataSourceAuthenticationMode;
  onAuthenticationModeChange: (mode: CreateDataSourceAuthenticationMode) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const options = useMemo(
    () => getCreateDataSourceAuthenticationOptions(dataSourceType),
    [dataSourceType]
  );

  if (!DATA_SOURCE_TYPES_WITH_AUTHENTICATION.has(dataSourceType)) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow label={createDataSourceFlyoutAuthenticationLabel()} fullWidth>
        <EuiSelect
          data-test-subj="createDataSourceFlyoutAuthentication"
          fullWidth
          options={options}
          value={authenticationMode}
          onChange={(e) =>
            onAuthenticationModeChange(e.target.value as CreateDataSourceAuthenticationMode)
          }
        />
      </EuiFormRow>
    </>
  );
}
