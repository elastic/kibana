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
import type { DataSourceWithSecrets } from '../common/datasource_types';

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
  const { field: accountField } = useController({
    defaultValue: '',
    name: 'settings.account',
    control,
  });
  const { field: authField } = useController({
    defaultValue: '',
    name: 'settings.auth',
    control,
  });
  const { field: connectionStringField } = useController({
    defaultValue: '',
    name: 'settings.connection_string',
    control,
  });
  const { field: keyField } = useController({
    defaultValue: '',
    name: 'settings.key',
    control,
  });
  const { field: sasTokenField } = useController({
    defaultValue: '',
    name: 'settings.sas_token',
    control,
  });

  useEffect(() => {
    return () => {
      unregister('settings.endpoint');
      unregister('settings.account');
      unregister('settings.auth');
      unregister('settings.connection_string');
      unregister('settings.key');
      unregister('settings.sas_token');
    };
  }, [unregister]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.azureBlob.fields.endpoint', {
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
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.azureBlob.fields.account', {
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
        label={i18n.translate('dataSourceManagement.createFlyout.azureBlob.fields.auth', {
          defaultMessage: 'Auth',
        })}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutAzureAuth"
          fullWidth
          autoComplete="off"
          value={authField.value}
          onChange={(e) => authField.onChange(e.target.value)}
          name={authField.name}
          inputRef={authField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate(
          'dataSourceManagement.createFlyout.azureBlob.fields.connectionString',
          {
            defaultMessage: 'Connection string',
          }
        )}
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
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.azureBlob.fields.key', {
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
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.azureBlob.fields.sasToken', {
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
    </>
  );
}
