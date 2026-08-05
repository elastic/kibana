/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';

import type { UseFormUnregister } from 'react-hook-form';
import { type Control, useController } from 'react-hook-form';
import type { CreateDataSourceFlyoutFormValues } from './types';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';
import type { AzureAuthenticationMode } from './create_data_source_flyout_authentication';
import type { FederatedIdentityClusterInfo } from './federated_identity_cluster_info';
import { FederatedIdentityDeployPanel } from './federated_identity_deploy_panel';
import { FederatedIdentityManualSetup } from './federated_identity_manual_setup';
import {
  getAzureFederatedIdentityDeployConfig,
  getAzureFederatedIdentityDescription,
  getAzureFederatedIdentityFieldHelp,
  getAzureFederatedIdentityManualIntro,
  getAzureFederatedIdentityManualSteps,
} from './federated_identity_azure_setup_content';
import { FederatedIdentitySetupShell } from './federated_identity_setup_shell';
import { resolveFederatedIdentitySetupValues } from './federated_identity_setup_values';

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
      label={createDataSourceFlyoutStrings.optionalFieldLabel(
        i18n.translate('xpack.dataFederation.createFlyout.azure.fields.endpoint', {
          defaultMessage: 'Endpoint',
        })
      )}
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
  cloudInfo,
  control,
  unregister,
}: {
  authenticationMode: AzureAuthenticationMode;
  areFieldsRequired: boolean;
  cloudInfo?: FederatedIdentityClusterInfo;
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
        cloudInfo={cloudInfo}
        control={control}
        unregister={unregister}
      />
    );
  }

  return null;
}

function CreateDataSourceFlyoutTypeSettingsAzureFederatedIdentityFields({
  areFieldsRequired,
  cloudInfo,
  control,
  unregister,
}: {
  areFieldsRequired: boolean;
  cloudInfo?: FederatedIdentityClusterInfo;
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
              : i18n.translate('xpack.dataFederation.createFlyout.azure.fields.tenantIdRequired', {
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
              : i18n.translate('xpack.dataFederation.createFlyout.azure.fields.clientIdRequired', {
                  defaultMessage: 'Client ID is required.',
                }),
        }
      : undefined,
  });

  useEffect(() => {
    return () => {
      unregister('settings.tenant_id');
      unregister('settings.client_id');
    };
  }, [unregister]);

  const setupValues = useMemo(
    () => resolveFederatedIdentitySetupValues(cloudInfo),
    [cloudInfo]
  );
  const manualSteps = useMemo(
    () => getAzureFederatedIdentityManualSteps(setupValues),
    [setupValues]
  );
  const deployConfig = useMemo(() => getAzureFederatedIdentityDeployConfig(), []);

  return (
    <>
      <FederatedIdentitySetupShell
        description={getAzureFederatedIdentityDescription()}
        oneClickLabel={i18n.translate(
          'xpack.dataFederation.createFlyout.azure.federated.setupMethod.oneClick',
          {
            defaultMessage: 'ARM template',
          }
        )}
        oneClickIcon={deployConfig.cloudProviderIcon}
        testSubjPrefix="createDataSourceFlyoutAzureFederated"
      >
        {(setupMethod) => (
          <>
            {setupMethod === 'manual' ? (
              <FederatedIdentityManualSetup
                intro={getAzureFederatedIdentityManualIntro()}
                steps={manualSteps}
                testSubjPrefix="createDataSourceFlyoutAzureFederated"
              />
            ) : (
              <FederatedIdentityDeployPanel
                {...deployConfig}
                testSubjPrefix="createDataSourceFlyoutAzureFederated"
              />
            )}
            <EuiSpacer size="l" />
            <EuiFormRow
              label={createDataSourceFlyoutStrings.fieldLabel(
                i18n.translate('xpack.dataFederation.createFlyout.azure.fields.tenantId', {
                  defaultMessage: 'Tenant ID',
                }),
                !areFieldsRequired
              )}
              fullWidth
              isInvalid={Boolean(tenantIdState.error)}
              error={tenantIdState.error?.message}
            >
              <EuiFieldText
                data-test-subj="createDataSourceFlyoutAzureTenantId"
                fullWidth
                autoComplete="off"
                isInvalid={Boolean(tenantIdState.error)}
                placeholder="00000000-0000-0000-0000-000000000000"
                value={tenantIdField.value}
                onChange={(e) => tenantIdField.onChange(e.target.value)}
                name={tenantIdField.name}
                inputRef={tenantIdField.ref}
              />
            </EuiFormRow>
            <EuiFormRow
              label={createDataSourceFlyoutStrings.fieldLabel(
                i18n.translate('xpack.dataFederation.createFlyout.azure.fields.clientId', {
                  defaultMessage: 'Client ID',
                }),
                !areFieldsRequired
              )}
              fullWidth
              isInvalid={Boolean(clientIdState.error)}
              error={clientIdState.error?.message}
              helpText={getAzureFederatedIdentityFieldHelp(setupMethod === 'one_click')}
            >
              <EuiFieldText
                data-test-subj="createDataSourceFlyoutAzureClientId"
                fullWidth
                autoComplete="off"
                isInvalid={Boolean(clientIdState.error)}
                placeholder="00000000-0000-0000-0000-000000000000"
                value={clientIdField.value}
                onChange={(e) => clientIdField.onChange(e.target.value)}
                name={clientIdField.name}
                inputRef={clientIdField.ref}
              />
            </EuiFormRow>
          </>
        )}
      </FederatedIdentitySetupShell>
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
              : i18n.translate('xpack.dataFederation.createFlyout.azure.fields.accountRequired', {
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
              : i18n.translate('xpack.dataFederation.createFlyout.azure.fields.keyRequired', {
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
        label={createDataSourceFlyoutStrings.fieldLabel(
          i18n.translate('xpack.dataFederation.createFlyout.azure.fields.account', {
            defaultMessage: 'Account',
          }),
          !areFieldsRequired
        )}
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
        label={createDataSourceFlyoutStrings.fieldLabel(
          i18n.translate('xpack.dataFederation.createFlyout.azure.fields.key', {
            defaultMessage: 'Key',
          }),
          !areFieldsRequired
        )}
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
