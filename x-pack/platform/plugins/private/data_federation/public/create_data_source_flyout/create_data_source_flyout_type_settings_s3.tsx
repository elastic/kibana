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
import type { FederatedIdentityClusterInfo } from './federated_identity_cluster_info';
import { FederatedIdentityDeployPanel } from './federated_identity_deploy_panel';
import { FederatedIdentityManualSetup } from './federated_identity_manual_setup';
import {
  getS3FederatedIdentityDeployConfig,
  getS3FederatedIdentityDescription,
  getS3FederatedIdentityManualIntro,
  getS3FederatedIdentityManualSteps,
  getS3FederatedIdentityRoleArnHelp,
  getS3FederatedIdentityRoleArnLabel,
} from './federated_identity_s3_setup_content';
import { FederatedIdentitySetupShell } from './federated_identity_setup_shell';
import { resolveFederatedIdentitySetupValues } from './federated_identity_setup_values';

export function CreateDataSourceFlyoutTypeSettingsS3({
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
        i18n.translate('xpack.dataFederation.createFlyout.s3.fields.endpoint', {
          defaultMessage: 'Endpoint',
        })
      )}
      fullWidth
    >
      <EuiFieldText
        data-test-subj="createDataSourceFlyoutS3Endpoint"
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

export function CreateDataSourceFlyoutTypeSettingsS3Credentials({
  control,
  unregister,
  areCredentialsRequired,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
  areCredentialsRequired: boolean;
}) {
  const { field: accessKeyField, fieldState: accessKeyState } = useController({
    name: 'settings.access_key',
    control,
    rules: areCredentialsRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('xpack.dataFederation.createFlyout.s3.fields.accessKeyRequired', {
                  defaultMessage: 'Access key is required.',
                }),
        }
      : undefined,
  });
  const { field: secretKeyField, fieldState: secretKeyState } = useController({
    name: 'settings.secret_key',
    control,
    rules: areCredentialsRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('xpack.dataFederation.createFlyout.s3.fields.secretKeyRequired', {
                  defaultMessage: 'Secret key is required.',
                }),
        }
      : undefined,
  });

  useEffect(() => {
    return () => {
      unregister('settings.access_key');
      unregister('settings.secret_key');
    };
  }, [unregister]);

  return (
    <>
      <EuiFormRow
        label={createDataSourceFlyoutStrings.fieldLabel(
          i18n.translate('xpack.dataFederation.createFlyout.s3.fields.accessKey', {
            defaultMessage: 'Access key',
          }),
          !areCredentialsRequired
        )}
        fullWidth
        isInvalid={Boolean(accessKeyState.error)}
        error={accessKeyState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutS3AccessKey"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(accessKeyState.error)}
          value={accessKeyField.value}
          onChange={(e) => accessKeyField.onChange(e.target.value)}
          name={accessKeyField.name}
          inputRef={accessKeyField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDataSourceFlyoutStrings.fieldLabel(
          i18n.translate('xpack.dataFederation.createFlyout.s3.fields.secretKey', {
            defaultMessage: 'Secret key',
          }),
          !areCredentialsRequired
        )}
        fullWidth
        isInvalid={Boolean(secretKeyState.error)}
        error={secretKeyState.error?.message}
      >
        <EuiFieldPassword
          type="dual"
          data-test-subj="createDataSourceFlyoutS3SecretKey"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(secretKeyState.error)}
          value={secretKeyField.value}
          onChange={(e) => secretKeyField.onChange(e.target.value)}
          name={secretKeyField.name}
          inputRef={secretKeyField.ref}
        />
      </EuiFormRow>
    </>
  );
}

export function CreateDataSourceFlyoutTypeSettingsS3FederatedIdentity({
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
  const { field: roleArnField, fieldState: roleArnState } = useController({
    name: 'settings.role_arn',
    control,
    rules: areFieldsRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('xpack.dataFederation.createFlyout.s3.fields.roleArnRequired', {
                  defaultMessage: 'Role ARN is required.',
                }),
        }
      : undefined,
  });

  useEffect(() => {
    return () => {
      unregister('settings.role_arn');
    };
  }, [unregister]);

  const setupValues = useMemo(
    () => resolveFederatedIdentitySetupValues(cloudInfo),
    [cloudInfo]
  );
  const manualSteps = useMemo(
    () => getS3FederatedIdentityManualSteps(setupValues),
    [setupValues]
  );
  const deployConfig = useMemo(() => getS3FederatedIdentityDeployConfig(), []);

  return (
    <>
      <FederatedIdentitySetupShell
        description={getS3FederatedIdentityDescription()}
        oneClickLabel={i18n.translate(
          'xpack.dataFederation.createFlyout.s3.federated.setupMethod.cloudFormation',
          {
            defaultMessage: 'Cloud formation',
          }
        )}
        oneClickIcon={deployConfig.cloudProviderIcon}
        testSubjPrefix="createDataSourceFlyoutS3Federated"
      >
        {(setupMethod) => (
          <>
            {setupMethod === 'manual' ? (
              <FederatedIdentityManualSetup
                intro={getS3FederatedIdentityManualIntro()}
                steps={manualSteps}
                testSubjPrefix="createDataSourceFlyoutS3Federated"
              />
            ) : (
              <FederatedIdentityDeployPanel
                {...deployConfig}
                testSubjPrefix="createDataSourceFlyoutS3Federated"
              />
            )}
            <EuiSpacer size="l" />
            <EuiFormRow
              label={createDataSourceFlyoutStrings.fieldLabel(
                getS3FederatedIdentityRoleArnLabel(setupMethod === 'one_click'),
                !areFieldsRequired
              )}
              fullWidth
              isInvalid={Boolean(roleArnState.error)}
              error={roleArnState.error?.message}
              helpText={getS3FederatedIdentityRoleArnHelp(setupMethod === 'one_click')}
            >
              <EuiFieldText
                data-test-subj="createDataSourceFlyoutS3FederatedRoleArn"
                fullWidth
                autoComplete="off"
                isInvalid={Boolean(roleArnState.error)}
                placeholder="arn:aws:iam::112233445566:role/elastic-data-federation"
                value={roleArnField.value}
                onChange={(e) => roleArnField.onChange(e.target.value)}
                name={roleArnField.name}
                inputRef={roleArnField.ref}
              />
            </EuiFormRow>
          </>
        )}
      </FederatedIdentitySetupShell>
    </>
  );
}
