/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import type { Control, UseFormUnregister } from 'react-hook-form';
import type { DataSourceType } from '../../common/datasource_types';
import type { CreateDataSourceFlyoutFormValues } from './create_data_source_flyout_form_state';
import {
  DATA_SOURCE_TYPES_WITH_AUTHENTICATION,
  showsAuthenticationCredentialFields,
  type AzureAuthenticationMode,
  type CreateDataSourceAuthenticationMode,
} from './create_data_source_flyout_authentication';
import { CreateDataSourceFlyoutTypeSettingsAzureAuthenticationFields } from './create_data_source_flyout_type_settings_azure';
import { CreateDataSourceFlyoutTypeSettingsGcsCredentials } from './create_data_source_flyout_type_settings_gcs';
import { CreateDataSourceFlyoutTypeSettingsS3Credentials } from './create_data_source_flyout_type_settings_s3';

export function CreateDataSourceFlyoutAuthenticationFields({
  authenticationMode,
  dataSourceType,
  requireS3Credentials,
  requireGcsCredentials,
  control,
  unregister,
}: {
  authenticationMode: CreateDataSourceAuthenticationMode;
  dataSourceType: DataSourceType;
  requireS3Credentials: boolean;
  requireGcsCredentials: boolean;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
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
          areCredentialsRequired={requireS3Credentials}
        />
      ) : null}
      {dataSourceType === 'gcs' ? (
        <CreateDataSourceFlyoutTypeSettingsGcsCredentials
          control={control}
          unregister={unregister}
          areCredentialsRequired={requireGcsCredentials}
        />
      ) : null}
      {dataSourceType === 'azure' ? (
        <CreateDataSourceFlyoutTypeSettingsAzureAuthenticationFields
          authenticationMode={authenticationMode as AzureAuthenticationMode}
          control={control}
          unregister={unregister}
        />
      ) : null}
    </>
  );
}
