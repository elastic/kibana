/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';

import type { UseFormUnregister } from 'react-hook-form';
import { type Control, useController } from 'react-hook-form';
import type { CreateDataSourceFlyoutFormValues } from './types';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';
import type { FederatedIdentityClusterInfo } from './federated_identity_cluster_info';
import { FederatedIdentityDeployPanel } from './federated_identity_deploy_panel';
import { FederatedIdentityManualSetup } from './federated_identity_manual_setup';
import {
  getGcsFederatedIdentityDeployConfig,
  getGcsFederatedIdentityDescription,
  getGcsFederatedIdentityManualIntro,
  getGcsFederatedIdentityManualSteps,
  getGcsFederatedIdentityStsAudienceHelp,
} from './federated_identity_gcs_setup_content';
import { FederatedIdentitySetupShell } from './federated_identity_setup_shell';
import { resolveFederatedIdentitySetupValues } from './federated_identity_setup_values';

export function CreateDataSourceFlyoutTypeSettingsGcs({
  control,
  unregister,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: projectIdField } = useController({
    name: 'settings.project_id',
    control,
  });
  const { field: endpointField } = useController({
    name: 'settings.endpoint',
    control,
  });
  const { field: tokenUriField } = useController({
    name: 'settings.token_uri',
    control,
  });

  useEffect(() => {
    return () => {
      unregister('settings.project_id');
      unregister('settings.endpoint');
      unregister('settings.token_uri');
    };
  }, [unregister]);

  return (
    <>
      <EuiFormRow
        label={createDataSourceFlyoutStrings.optionalFieldLabel(
          i18n.translate('xpack.dataFederation.createFlyout.gcs.fields.projectId', {
            defaultMessage: 'Project ID',
          })
        )}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutGcsProjectId"
          fullWidth
          autoComplete="off"
          value={projectIdField.value}
          onChange={(e) => projectIdField.onChange(e.target.value)}
          name={projectIdField.name}
          inputRef={projectIdField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDataSourceFlyoutStrings.optionalFieldLabel(
          i18n.translate('xpack.dataFederation.createFlyout.gcs.fields.endpoint', {
            defaultMessage: 'Endpoint',
          })
        )}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutGcsEndpoint"
          fullWidth
          autoComplete="off"
          value={endpointField.value}
          onChange={(e) => endpointField.onChange(e.target.value)}
          name={endpointField.name}
          inputRef={endpointField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDataSourceFlyoutStrings.optionalFieldLabel(
          i18n.translate('xpack.dataFederation.createFlyout.gcs.fields.tokenUri', {
            defaultMessage: 'Token URI',
          })
        )}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutGcsTokenUri"
          fullWidth
          autoComplete="off"
          value={tokenUriField.value}
          onChange={(e) => tokenUriField.onChange(e.target.value)}
          name={tokenUriField.name}
          inputRef={tokenUriField.ref}
        />
      </EuiFormRow>
    </>
  );
}

export function CreateDataSourceFlyoutTypeSettingsGcsCredentials({
  control,
  unregister,
  areCredentialsRequired,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
  areCredentialsRequired: boolean;
}) {
  const { field: credentialsField, fieldState: credentialsState } = useController({
    name: 'settings.credentials',
    control,
    rules: areCredentialsRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('xpack.dataFederation.createFlyout.gcs.fields.credentialsRequired', {
                  defaultMessage: 'Credentials are required.',
                }),
        }
      : undefined,
  });

  useEffect(() => {
    return () => {
      unregister('settings.credentials');
    };
  }, [unregister]);

  return (
    <EuiFormRow
      label={createDataSourceFlyoutStrings.fieldLabel(
        i18n.translate('xpack.dataFederation.createFlyout.gcs.fields.credentials', {
          defaultMessage: 'Credentials',
        }),
        !areCredentialsRequired
      )}
      fullWidth
      isInvalid={Boolean(credentialsState.error)}
      error={credentialsState.error?.message}
    >
      <EuiTextArea
        data-test-subj="createDataSourceFlyoutGcsCredentials"
        fullWidth
        rows={3}
        autoComplete="off"
        isInvalid={Boolean(credentialsState.error)}
        value={credentialsField.value ?? ''}
        onChange={(e) => credentialsField.onChange(e.target.value)}
        name={credentialsField.name}
        inputRef={credentialsField.ref}
      />
    </EuiFormRow>
  );
}

export function CreateDataSourceFlyoutTypeSettingsGcsFederatedIdentity({
  control,
  cloudInfo,
  unregister,
  areFieldsRequired,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  cloudInfo?: FederatedIdentityClusterInfo;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
  areFieldsRequired: boolean;
}) {
  const { field: stsAudienceField, fieldState: stsAudienceState } = useController({
    name: 'settings.sts_audience',
    control,
    rules: areFieldsRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('xpack.dataFederation.createFlyout.gcs.fields.stsAudienceRequired', {
                  defaultMessage: 'STS audience is required.',
                }),
        }
      : undefined,
  });

  useEffect(() => {
    return () => {
      unregister('settings.sts_audience');
    };
  }, [unregister]);

  const setupValues = useMemo(
    () => resolveFederatedIdentitySetupValues(cloudInfo),
    [cloudInfo]
  );
  const manualSteps = useMemo(
    () => getGcsFederatedIdentityManualSteps(setupValues),
    [setupValues]
  );
  const deployConfig = useMemo(() => getGcsFederatedIdentityDeployConfig(), []);

  return (
    <>
      <FederatedIdentitySetupShell
        description={getGcsFederatedIdentityDescription()}
        oneClickLabel={i18n.translate(
          'xpack.dataFederation.createFlyout.gcs.federated.setupMethod.oneClick',
          {
            defaultMessage: 'One-click deploy',
          }
        )}
        oneClickIcon={deployConfig.cloudProviderIcon}
        testSubjPrefix="createDataSourceFlyoutGcsFederated"
      >
        {(setupMethod) => (
          <>
            {setupMethod === 'manual' ? (
              <FederatedIdentityManualSetup
                intro={getGcsFederatedIdentityManualIntro()}
                steps={manualSteps}
                testSubjPrefix="createDataSourceFlyoutGcsFederated"
              />
            ) : (
              <FederatedIdentityDeployPanel
                {...deployConfig}
                testSubjPrefix="createDataSourceFlyoutGcsFederated"
              />
            )}
            <EuiSpacer size="l" />
            <EuiFormRow
              label={createDataSourceFlyoutStrings.fieldLabel(
                i18n.translate('xpack.dataFederation.createFlyout.gcs.fields.stsAudience', {
                  defaultMessage: 'STS audience',
                }),
                !areFieldsRequired
              )}
              fullWidth
              isInvalid={Boolean(stsAudienceState.error)}
              error={stsAudienceState.error?.message}
              helpText={getGcsFederatedIdentityStsAudienceHelp(setupMethod === 'one_click')}
            >
              <EuiFieldText
                data-test-subj="createDataSourceFlyoutGcsFederatedStsAudience"
                fullWidth
                autoComplete="off"
                isInvalid={Boolean(stsAudienceState.error)}
                placeholder="//iam.googleapis.com/projects/112233445566/locations/global/workloadIdentityPools/elastic-data-federation/providers/elastic-issuer"
                value={stsAudienceField.value}
                onChange={(e) => stsAudienceField.onChange(e.target.value)}
                name={stsAudienceField.name}
                inputRef={stsAudienceField.ref}
              />
            </EuiFormRow>
          </>
        )}
      </FederatedIdentitySetupShell>
    </>
  );
}
