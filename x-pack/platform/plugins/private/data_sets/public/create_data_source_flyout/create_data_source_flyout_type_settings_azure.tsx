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
  areFieldsRequired,
  control,
  unregister,
}: {
  authenticationMode: AzureAuthenticationMode;
  areFieldsRequired: boolean;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  if (authenticationMode === 'credentials') {
    return (
      <CreateDataSourceFlyoutTypeSettingsAzureCredentialsFields
        areFieldsRequired={areFieldsRequired}
        control={control}
        unregister={unregister}
      />
    );
  }

  if (authenticationMode === 'federated_identity') {
    return (
      <CreateDataSourceFlyoutTypeSettingsAzureFederatedIdentityFields
        areFieldsRequired={areFieldsRequired}
        control={control}
        unregister={unregister}
      />
    );
  }

  return null;
}

function CreateDataSourceFlyoutTypeSettingsAzureFederatedIdentityFields({
  areFieldsRequired,
  control,
  unregister,
}: {
  areFieldsRequired: boolean;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: tenantIdField, fieldState: tenantIdState } = useController({
    name: 'settings.tenant_id',
    control,
    rules: areFieldsRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('dataSets.createFlyout.azure.fields.tenantIdRequired', {
                  defaultMessage: 'Tenant ID is required.',
                }),
        }
      : undefined,
  });

  const { field: clientIdField, fieldState: clientIdState } = useController({
    name: 'settings.client_id',
    control,
    rules: areFieldsRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('dataSets.createFlyout.azure.fields.clientIdRequired', {
                  defaultMessage: 'Client ID is required.',
                }),
        }
      : undefined,
  });

  const { field: jwtAudienceField, fieldState: jwtAudienceState } = useController({
    name: 'settings.jwt_audience',
    control,
    rules: areFieldsRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('dataSets.createFlyout.azure.fields.jwtAudienceRequired', {
                  defaultMessage: 'JWT audience is required.',
                }),
        }
      : undefined,
  });

  useEffect(() => {
    return () => {
      unregister('settings.tenant_id');
      unregister('settings.client_id');
      unregister('settings.jwt_audience');
    };
  }, [unregister]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.azure.fields.tenantId', {
          defaultMessage: 'Tenant ID',
        })}
        fullWidth
        isInvalid={Boolean(tenantIdState.error)}
        error={tenantIdState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutAzureTenantId"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(tenantIdState.error)}
          value={tenantIdField.value}
          onChange={(e) => tenantIdField.onChange(e.target.value)}
          name={tenantIdField.name}
          inputRef={tenantIdField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.azure.fields.clientId', {
          defaultMessage: 'Client ID',
        })}
        fullWidth
        isInvalid={Boolean(clientIdState.error)}
        error={clientIdState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutAzureClientId"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(clientIdState.error)}
          value={clientIdField.value}
          onChange={(e) => clientIdField.onChange(e.target.value)}
          name={clientIdField.name}
          inputRef={clientIdField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.azure.fields.jwtAudience', {
          defaultMessage: 'JWT audience',
        })}
        fullWidth
        isInvalid={Boolean(jwtAudienceState.error)}
        error={jwtAudienceState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutAzureJwtAudience"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(jwtAudienceState.error)}
          value={jwtAudienceField.value}
          onChange={(e) => jwtAudienceField.onChange(e.target.value)}
          name={jwtAudienceField.name}
          inputRef={jwtAudienceField.ref}
        />
      </EuiFormRow>
    </>
  );
}

function CreateDataSourceFlyoutTypeSettingsAzureCredentialsFields({
  areFieldsRequired,
  control,
  unregister,
}: {
  areFieldsRequired: boolean;
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: accountField, fieldState: accountState } = useController({
    name: 'settings.account',
    control,
    rules: areFieldsRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('dataSets.createFlyout.azure.fields.accountRequired', {
                  defaultMessage: 'Account is required.',
                }),
        }
      : undefined,
  });
  const { field: keyField, fieldState: keyState } = useController({
    name: 'settings.key',
    control,
    rules: areFieldsRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('dataSets.createFlyout.azure.fields.keyRequired', {
                  defaultMessage: 'Key is required.',
                }),
        }
      : undefined,
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
        isInvalid={Boolean(accountState.error)}
        error={accountState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutAzureAccount"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(accountState.error)}
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
        isInvalid={Boolean(keyState.error)}
        error={keyState.error?.message}
      >
        <EuiFieldPassword
          type="dual"
          data-test-subj="createDataSourceFlyoutAzureKey"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(keyState.error)}
          value={keyField.value}
          onChange={(e) => keyField.onChange(e.target.value)}
          name={keyField.name}
          inputRef={keyField.ref}
        />
      </EuiFormRow>
    </>
  );
}
