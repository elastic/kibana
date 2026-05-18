/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { Control, UseFormUnregister } from 'react-hook-form';
import type { DataSourceType, DataSourceWithSecrets } from '../../common/datasource_types';
import {
  DATA_SOURCE_TYPES_WITH_AUTHENTICATION,
  showsAuthenticationCredentialFields,
  type AzureBlobAuthenticationMode,
  type CreateDataSourceAuthenticationMode,
} from './create_data_source_flyout_authentication';
import { CreateDataSourceFlyoutTypeSettingsAzureBlobAuthenticationFields } from './create_data_source_flyout_type_settings_azure_blob';
import { CreateDataSourceFlyoutTypeSettingsGcsCredentials } from './create_data_source_flyout_type_settings_gcs';
import { CreateDataSourceFlyoutTypeSettingsS3Credentials } from './create_data_source_flyout_type_settings_s3';

export function CreateDataSourceFlyoutAuthenticationFields({
  authenticationMode,
  dataSourceType,
  control,
  unregister,
}: {
  authenticationMode: CreateDataSourceAuthenticationMode;
  dataSourceType: DataSourceType;
  control: Control<DataSourceWithSecrets, any>;
  unregister: UseFormUnregister<DataSourceWithSecrets>;
}) {
  if (
    !DATA_SOURCE_TYPES_WITH_AUTHENTICATION.has(dataSourceType) ||
    !showsAuthenticationCredentialFields(authenticationMode, dataSourceType)
  ) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      {dataSourceType === 's3' ? (
        <CreateDataSourceFlyoutTypeSettingsS3Credentials
          control={control}
          unregister={unregister}
        />
      ) : null}
      {dataSourceType === 'gcs' ? (
        <CreateDataSourceFlyoutTypeSettingsGcsCredentials
          control={control}
          unregister={unregister}
        />
      ) : null}
      {dataSourceType === 'azure_blob' ? (
        <CreateDataSourceFlyoutTypeSettingsAzureBlobAuthenticationFields
          authenticationMode={authenticationMode as AzureBlobAuthenticationMode}
          control={control}
          unregister={unregister}
        />
      ) : null}
    </>
  );
}
