/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldPassword, EuiFieldText, EuiFormRow } from '@elastic/eui';

import type { UseFormUnregister } from 'react-hook-form';
import { type Control, useController } from 'react-hook-form';
import type { DataSourceWithSecrets } from '../../common/datasource_types';
import type { AzureBlobAuthenticationMode } from './create_data_source_flyout_authentication';

export function CreateDataSourceFlyoutTypeSettingsAzureBlob({
  control,
  unregister,
}: {
  control: Control<DataSourceWithSecrets, any>;
  unregister: UseFormUnregister<DataSourceWithSecrets>;
}) {
  const { field: endpointField } = useController({
    defaultValue: '',
    name: 'settings.endpoint',
    control,
  });

  useEffect(() => {
    return () => {
      unregister('settings.endpoint');
    };
  }, [unregister]);

  return (
    <EuiFormRow
      label={i18n.translate('dataSets.createFlyout.azureBlob.fields.endpoint', {
        defaultMessage: 'Endpoint',
      })}
      fullWidth
    >
      <EuiFieldText
        data-test-subj="createDataSourceFlyoutAzureEndpoint"
        fullWidth
        autoComplete="off"
        value={endpointField.value}
        onChange={(e) => endpointField.onChange(e.target.value)}
        name={endpointField.name}
        inputRef={endpointField.ref}
      />
    </EuiFormRow>
  );
}

export function CreateDataSourceFlyoutTypeSettingsAzureBlobAuthenticationFields({
  authenticationMode,
  control,
  unregister,
}: {
  authenticationMode: AzureBlobAuthenticationMode;
  control: Control<DataSourceWithSecrets, any>;
  unregister: UseFormUnregister<DataSourceWithSecrets>;
}) {
  if (authenticationMode === 'default_credential_chain') {
    return null;
  }

  if (authenticationMode === 'credentials') {
    return (
      <CreateDataSourceFlyoutTypeSettingsAzureBlobCredentialsFields
        control={control}
        unregister={unregister}
      />
    );
  }

  if (authenticationMode === 'connection_string') {
    return (
      <CreateDataSourceFlyoutTypeSettingsAzureBlobConnectionStringField
        control={control}
        unregister={unregister}
      />
    );
  }

  return (
    <CreateDataSourceFlyoutTypeSettingsAzureBlobSasTokenField
      control={control}
      unregister={unregister}
    />
  );
}

function CreateDataSourceFlyoutTypeSettingsAzureBlobCredentialsFields({
  control,
  unregister,
}: {
  control: Control<DataSourceWithSecrets, any>;
  unregister: UseFormUnregister<DataSourceWithSecrets>;
}) {
  const { field: accountField } = useController({
    defaultValue: '',
    name: 'settings.account',
    control,
  });
  const { field: keyField } = useController({
    defaultValue: '',
    name: 'settings.key',
    control,
  });

  useEffect(() => {
    return () => {
      unregister('settings.account');
      unregister('settings.key');
    };
  }, [unregister]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.azureBlob.fields.account', {
          defaultMessage: 'Account',
        })}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutAzureAccount"
          fullWidth
          autoComplete="off"
          value={accountField.value}
          onChange={(e) => accountField.onChange(e.target.value)}
          name={accountField.name}
          inputRef={accountField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.azureBlob.fields.key', {
          defaultMessage: 'Key',
        })}
        fullWidth
      >
        <EuiFieldPassword
          type="dual"
          data-test-subj="createDataSourceFlyoutAzureKey"
          fullWidth
          autoComplete="off"
          value={keyField.value}
          onChange={(e) => keyField.onChange(e.target.value)}
          name={keyField.name}
          inputRef={keyField.ref}
        />
      </EuiFormRow>
    </>
  );
}

function CreateDataSourceFlyoutTypeSettingsAzureBlobConnectionStringField({
  control,
  unregister,
}: {
  control: Control<DataSourceWithSecrets, any>;
  unregister: UseFormUnregister<DataSourceWithSecrets>;
}) {
  const { field: connectionStringField } = useController({
    defaultValue: '',
    name: 'settings.connection_string',
    control,
  });

  useEffect(() => {
    return () => {
      unregister('settings.connection_string');
    };
  }, [unregister]);

  return (
    <EuiFormRow
      label={i18n.translate('dataSets.createFlyout.azureBlob.fields.connectionString', {
        defaultMessage: 'Connection string',
      })}
      fullWidth
    >
      <EuiFieldPassword
        type="dual"
        data-test-subj="createDataSourceFlyoutAzureConnectionString"
        fullWidth
        autoComplete="off"
        value={connectionStringField.value}
        onChange={(e) => connectionStringField.onChange(e.target.value)}
        name={connectionStringField.name}
        inputRef={connectionStringField.ref}
      />
    </EuiFormRow>
  );
}

function CreateDataSourceFlyoutTypeSettingsAzureBlobSasTokenField({
  control,
  unregister,
}: {
  control: Control<DataSourceWithSecrets, any>;
  unregister: UseFormUnregister<DataSourceWithSecrets>;
}) {
  const { field: sasTokenField } = useController({
    defaultValue: '',
    name: 'settings.sas_token',
    control,
  });

  useEffect(() => {
    return () => {
      unregister('settings.sas_token');
    };
  }, [unregister]);

  return (
    <EuiFormRow
      label={i18n.translate('dataSets.createFlyout.azureBlob.fields.sasToken', {
        defaultMessage: 'SAS token',
      })}
      fullWidth
    >
      <EuiFieldPassword
        type="dual"
        data-test-subj="createDataSourceFlyoutAzureSasToken"
        fullWidth
        autoComplete="off"
        value={sasTokenField.value}
        onChange={(e) => sasTokenField.onChange(e.target.value)}
        name={sasTokenField.name}
        inputRef={sasTokenField.ref}
      />
    </EuiFormRow>
  );
}
