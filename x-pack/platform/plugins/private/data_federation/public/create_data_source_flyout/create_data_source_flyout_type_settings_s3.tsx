/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldPassword, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';

import type { UseFormUnregister } from 'react-hook-form';
import { type Control, useController } from 'react-hook-form';
import type { CreateDataSourceFlyoutFormValues } from './types';
import type { FederatedIdentityClusterInfo } from './federated_identity_cluster_info';
import { FederatedIdentityManualSetup } from './federated_identity_manual_setup';
import {
  getS3FederatedIdentityManualSteps,
  s3FederatedIdentitySetupStrings,
} from './federated_identity_s3_setup_content';

const ROLE_ARN_PLACEHOLDER = 'arn:aws:iam::112233445566:role/elastic-data-federation';

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
      label={i18n.translate('xpack.dataFederation.createFlyout.s3.fields.endpoint', {
        defaultMessage: 'Endpoint',
      })}
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
        label={i18n.translate('xpack.dataFederation.createFlyout.s3.fields.accessKey', {
          defaultMessage: 'Access key',
        })}
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
        label={i18n.translate('xpack.dataFederation.createFlyout.s3.fields.secretKey', {
          defaultMessage: 'Secret key',
        })}
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

  const { jwtIssuer, deploymentId } = cloudInfo ?? {};
  const setupValues = jwtIssuer && deploymentId ? { jwtIssuer, subject: deploymentId } : undefined;

  return (
    <>
      {setupValues ? (
        <>
          <FederatedIdentityManualSetup
            intro={s3FederatedIdentitySetupStrings.manualIntro}
            steps={getS3FederatedIdentityManualSteps(setupValues)}
            testSubjPrefix="createDataSourceFlyoutS3Federated"
          />
          <EuiSpacer size="l" />
        </>
      ) : null}
      <EuiFormRow
        label={s3FederatedIdentitySetupStrings.roleArnLabel}
        fullWidth
        isInvalid={Boolean(roleArnState.error)}
        error={roleArnState.error?.message}
        helpText={setupValues ? s3FederatedIdentitySetupStrings.roleArnHelp : undefined}
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutS3FederatedRoleArn"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(roleArnState.error)}
          placeholder={ROLE_ARN_PLACEHOLDER}
          value={roleArnField.value}
          onChange={(e) => roleArnField.onChange(e.target.value)}
          name={roleArnField.name}
          inputRef={roleArnField.ref}
        />
      </EuiFormRow>
    </>
  );
}
