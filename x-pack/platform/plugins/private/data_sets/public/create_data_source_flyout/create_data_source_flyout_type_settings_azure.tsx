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
import type { CreateDataSourceFlyoutFormValues } from './create_data_source_flyout_form_state';
import type { AzureAuthenticationMode } from './create_data_source_flyout_authentication';

export function CreateDataSourceFlyoutTypeSettingsAzure({
  control,
  unregister,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: endpointField } = useController({
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
      label={i18n.translate('dataSets.createFlyout.azure.fields.endpoint', {
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

export function CreateDataSourceFlyoutTypeSettingsAzureAuthenticationFields({
  authenticationMode,
  control,
  unregister,
}: {
  authenticationMode: AzureAuthenticationMode;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  if (authenticationMode === 'credentials') {
    return (
      <CreateDataSourceFlyoutTypeSettingsAzureCredentialsFields
        control={control}
        unregister={unregister}
      />
    );
  }

  if (authenticationMode === 'connection_string') {
    return (
      <CreateDataSourceFlyoutTypeSettingsAzureConnectionStringField
        control={control}
        unregister={unregister}
      />
    );
  }

  return (
    <CreateDataSourceFlyoutTypeSettingsAzureSasTokenField
      control={control}
      unregister={unregister}
    />
  );
}

function CreateDataSourceFlyoutTypeSettingsAzureCredentialsFields({
  control,
  unregister,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: accountField } = useController({
    name: 'settings.account',
    control,
  });
  const { field: keyField } = useController({
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
        label={i18n.translate('dataSets.createFlyout.azure.fields.account', {
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
        label={i18n.translate('dataSets.createFlyout.azure.fields.key', {
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

function CreateDataSourceFlyoutTypeSettingsAzureConnectionStringField({
  control,
  unregister,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: connectionStringField } = useController({
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
      label={i18n.translate('dataSets.createFlyout.azure.fields.connectionString', {
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

function CreateDataSourceFlyoutTypeSettingsAzureSasTokenField({
  control,
  unregister,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: sasTokenField } = useController({
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
      label={i18n.translate('dataSets.createFlyout.azure.fields.sasToken', {
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
