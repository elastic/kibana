/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldPassword, EuiFieldText, EuiFormRow, EuiSpacer, EuiTextColor } from '@elastic/eui';

import { type Control, useController } from 'react-hook-form';
import type { CreateDataSourceFlyoutFormValues } from './types';
import type { FederatedIdentityClusterInfo } from './federated_identity_cluster_info';
import { FederatedIdentityDeployPanel } from './federated_identity_deploy_panel';
import { FederatedIdentityManualSetup } from './federated_identity_manual_setup';
import type {
  FederatedIdentitySetupMethod,
  FederatedIdentitySetupMethodOption,
} from './federated_identity_setup_method_cards';
import { FederatedIdentitySetupMethodCards } from './federated_identity_setup_method_cards';
import {
  getS3FederatedIdentityDeployConfig,
  getS3FederatedIdentityManualSteps,
  s3FederatedIdentitySetupStrings,
} from './federated_identity_s3_setup_content';

const ROLE_ARN_PLACEHOLDER = 'arn:aws:iam::112233445566:role/elastic-data-federation';

// Matches IAM role ARNs only, so the provider, policy or stack ARNs the setup also creates are rejected.
const IAM_ROLE_ARN_REGEX = /^arn:aws[a-z-]*:iam::[0-9]+:role\/.+$/;
// Name of the role the CloudFormation stack outputs. Only warned about, so other valid roles still save.
const CLOUDFORMATION_ROLE_NAME_REGEX = /:role\/(?:.+\/)?ElasticEsqlDataFederation-[^/]+$/;

const SETUP_METHOD_OPTIONS: FederatedIdentitySetupMethodOption[] = [
  {
    id: 'cloudformation',
    label: s3FederatedIdentitySetupStrings.cloudFormationMethod,
    icon: 'logoAWS',
  },
  { id: 'manual', label: s3FederatedIdentitySetupStrings.manualMethod, icon: 'commandLine' },
];

export function CreateDataSourceFlyoutTypeSettingsS3Region({
  control,
  isRequired,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  isRequired: boolean;
}) {
  const { field: regionField, fieldState: regionState } = useController({
    name: 'settings.region',
    control,
    rules: isRequired
      ? {
          validate: (value?: string) =>
            value?.trim()
              ? true
              : i18n.translate('xpack.dataFederation.createFlyout.s3.fields.regionRequired', {
                  defaultMessage: 'Region is required.',
                }),
        }
      : undefined,
  });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.dataFederation.createFlyout.s3.fields.region', {
        defaultMessage: 'Region',
      })}
      fullWidth
      isInvalid={Boolean(regionState.error)}
      error={regionState.error?.message}
    >
      <EuiFieldText
        data-test-subj="createDataSourceFlyoutS3Region"
        fullWidth
        autoComplete="off"
        isInvalid={Boolean(regionState.error)}
        value={regionField.value ?? ''}
        onChange={(e) => regionField.onChange(e.target.value)}
        name={regionField.name}
        inputRef={regionField.ref}
      />
    </EuiFormRow>
  );
}

export function CreateDataSourceFlyoutTypeSettingsS3({
  control,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
}) {
  const { field: endpointField } = useController({
    name: 'settings.endpoint',
    control,
  });

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
        value={endpointField.value ?? ''}
        onChange={(e) => endpointField.onChange(e.target.value)}
        name={endpointField.name}
        inputRef={endpointField.ref}
      />
    </EuiFormRow>
  );
}

export function CreateDataSourceFlyoutTypeSettingsS3Credentials({
  control,
  areCredentialsRequired,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
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
          value={accessKeyField.value ?? ''}
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
          value={secretKeyField.value ?? ''}
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
  areFieldsRequired,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  cloudInfo?: FederatedIdentityClusterInfo;
  areFieldsRequired: boolean;
}) {
  const [setupMethod, setSetupMethod] = useState<FederatedIdentitySetupMethod>('cloudformation');

  const setupValues =
    cloudInfo?.jwtIssuer && cloudInfo.deploymentId
      ? {
          jwtIssuer: cloudInfo.jwtIssuer,
          subject: cloudInfo.deploymentId,
          templateUrl: cloudInfo.awsCloudFormationTemplateUrl,
        }
      : undefined;
  // Edit mode keeps roles created before, so only new data sources set up with the stack are checked.
  const expectsCloudFormationRole =
    areFieldsRequired && Boolean(setupValues) && setupMethod === 'cloudformation';

  const { field: roleArnField, fieldState: roleArnState } = useController({
    name: 'settings.role_arn',
    control,
    rules: {
      validate: (value?: string) => {
        const roleArn = value?.trim();

        if (!roleArn) {
          return areFieldsRequired
            ? i18n.translate('xpack.dataFederation.createFlyout.s3.fields.roleArnRequired', {
                defaultMessage: 'Role ARN is required.',
              })
            : true;
        }

        return IAM_ROLE_ARN_REGEX.test(roleArn)
          ? true
          : i18n.translate('xpack.dataFederation.createFlyout.s3.fields.roleArnInvalid', {
              defaultMessage:
                'Enter the ARN of an IAM role, for example arn:aws:iam::123456789012:role/role-name.',
            });
      },
    },
  });

  const currentRoleArn = roleArnField.value?.trim() ?? '';
  const showCloudFormationRoleWarning =
    expectsCloudFormationRole &&
    IAM_ROLE_ARN_REGEX.test(currentRoleArn) &&
    !CLOUDFORMATION_ROLE_NAME_REGEX.test(currentRoleArn);
  const roleArnHelpText =
    setupMethod === 'cloudformation'
      ? s3FederatedIdentitySetupStrings.deployRoleArnHelp
      : s3FederatedIdentitySetupStrings.roleArnHelp;

  return (
    <>
      {setupValues ? (
        <>
          <FederatedIdentitySetupMethodCards
            options={SETUP_METHOD_OPTIONS}
            selectedMethod={setupMethod}
            onMethodChange={setSetupMethod}
            testSubjPrefix="createDataSourceFlyoutS3Federated"
          />
          <EuiSpacer size="l" />
          {setupMethod === 'cloudformation' ? (
            <FederatedIdentityDeployPanel
              config={getS3FederatedIdentityDeployConfig(setupValues)}
              testSubjPrefix="createDataSourceFlyoutS3Federated"
            />
          ) : (
            <FederatedIdentityManualSetup
              intro={s3FederatedIdentitySetupStrings.manualIntro}
              steps={getS3FederatedIdentityManualSteps(setupValues)}
              testSubjPrefix="createDataSourceFlyoutS3Federated"
            />
          )}
          <EuiSpacer size="l" />
        </>
      ) : null}
      <EuiFormRow
        label={s3FederatedIdentitySetupStrings.roleArnLabel}
        fullWidth
        isInvalid={Boolean(roleArnState.error)}
        error={roleArnState.error?.message}
        helpText={
          setupValues
            ? [
                roleArnHelpText,
                ...(showCloudFormationRoleWarning
                  ? [
                      <EuiTextColor
                        color="warning"
                        key="cloudFormationRoleWarning"
                        data-test-subj="createDataSourceFlyoutS3FederatedRoleArnWarning"
                      >
                        {s3FederatedIdentitySetupStrings.cloudFormationRoleWarning}
                      </EuiTextColor>,
                    ]
                  : []),
              ]
            : undefined
        }
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutS3FederatedRoleArn"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(roleArnState.error)}
          placeholder={ROLE_ARN_PLACEHOLDER}
          value={roleArnField.value ?? ''}
          onChange={(e) => roleArnField.onChange(e.target.value)}
          name={roleArnField.name}
          inputRef={roleArnField.ref}
        />
      </EuiFormRow>
    </>
  );
}
