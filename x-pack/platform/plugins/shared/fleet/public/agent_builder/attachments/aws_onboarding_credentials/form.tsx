/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiFieldPassword,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';

import { AWS_ONBOARDING_CREDENTIALS_QUERY_KEY } from '../../../components/cloud_connector/hooks/use_managed_onboarding';
import { useManagedOnboardingCredentials } from '../../../components/cloud_connector/hooks/use_managed_onboarding_credentials';

import { AWS_ONBOARDING_VERIFY_QUERY_KEY } from './card';

interface FormState {
  region: string;
  accessKeyId: string;
  discoveryRoleArn: string;
  provisioningRoleArn: string;
  bootstrapStackArn: string;
  stackNamePrefix: string;
}

export const AwsOnboardingCredentialsForm: React.FC<{
  region: string;
  onSaved: () => void;
}> = ({ region, onSaved }) => {
  const queryClient = useQueryClient();
  const { save } = useManagedOnboardingCredentials();
  const [values, setValues] = useState<FormState>({
    region,
    accessKeyId: '',
    discoveryRoleArn: '',
    provisioningRoleArn: '',
    bootstrapStackArn: '',
    stackNamePrefix: '',
  });
  // Kept in its own state and cleared on submit so the secret lives no longer than needed.
  const [secretAccessKey, setSecretAccessKey] = useState('');

  const setField = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((previous) => ({ ...previous, [field]: e.target.value }));

  const isValid =
    values.region.trim() !== '' &&
    values.accessKeyId.trim() !== '' &&
    secretAccessKey !== '' &&
    values.discoveryRoleArn.trim() !== '' &&
    values.provisioningRoleArn.trim() !== '';

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const secret = secretAccessKey;
      setSecretAccessKey('');
      try {
        await save.mutateAsync({
          region: values.region.trim(),
          accessKeyId: values.accessKeyId.trim(),
          discoveryRoleArn: values.discoveryRoleArn.trim(),
          provisioningRoleArn: values.provisioningRoleArn.trim(),
          ...(values.bootstrapStackArn.trim()
            ? { bootstrapStackArn: values.bootstrapStackArn.trim() }
            : {}),
          ...(values.stackNamePrefix.trim()
            ? { stackNamePrefix: values.stackNamePrefix.trim() }
            : {}),
          secrets: { secretAccessKey: secret },
        });
      } catch {
        // The mutation already toasted the error; keep the form open for another attempt.
        return;
      }
      // The card reads these queries, so refresh them before closing the canvas.
      await Promise.all([
        queryClient.invalidateQueries([AWS_ONBOARDING_CREDENTIALS_QUERY_KEY]),
        queryClient.invalidateQueries([AWS_ONBOARDING_VERIFY_QUERY_KEY]),
      ]);
      onSaved();
    },
    [save, queryClient, onSaved, secretAccessKey, values]
  );

  return (
    <EuiForm component="form" onSubmit={onSubmit} data-test-subj="awsOnboardingForm">
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.fleet.awsOnboardingCredentialsForm.region', {
          defaultMessage: 'Region',
        })}
      >
        <EuiFieldText
          fullWidth
          value={values.region}
          onChange={setField('region')}
          data-test-subj="awsOnboardingFormRegion"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.fleet.awsOnboardingCredentialsForm.accessKeyId', {
          defaultMessage: 'Access key ID',
        })}
      >
        <EuiFieldText
          fullWidth
          autoComplete="off"
          value={values.accessKeyId}
          onChange={setField('accessKeyId')}
          data-test-subj="awsOnboardingFormAccessKeyId"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.fleet.awsOnboardingCredentialsForm.secretAccessKey', {
          defaultMessage: 'Secret access key',
        })}
      >
        <EuiFieldPassword
          fullWidth
          autoComplete="new-password"
          value={secretAccessKey}
          onChange={(e) => setSecretAccessKey(e.target.value)}
          data-test-subj="awsOnboardingFormSecretAccessKey"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.fleet.awsOnboardingCredentialsForm.discoveryRoleArn', {
          defaultMessage: 'Discovery role ARN',
        })}
      >
        <EuiFieldText
          fullWidth
          value={values.discoveryRoleArn}
          onChange={setField('discoveryRoleArn')}
          data-test-subj="awsOnboardingFormDiscoveryRoleArn"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.fleet.awsOnboardingCredentialsForm.provisioningRoleArn', {
          defaultMessage: 'Provisioning role ARN',
        })}
      >
        <EuiFieldText
          fullWidth
          value={values.provisioningRoleArn}
          onChange={setField('provisioningRoleArn')}
          data-test-subj="awsOnboardingFormProvisioningRoleArn"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.fleet.awsOnboardingCredentialsForm.bootstrapStackArn', {
          defaultMessage: 'Bootstrap stack ARN (optional)',
        })}
      >
        <EuiFieldText
          fullWidth
          value={values.bootstrapStackArn}
          onChange={setField('bootstrapStackArn')}
          data-test-subj="awsOnboardingFormBootstrapStackArn"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.fleet.awsOnboardingCredentialsForm.stackNamePrefix', {
          defaultMessage: 'Stack name prefix (optional)',
        })}
      >
        <EuiFieldText
          fullWidth
          value={values.stackNamePrefix}
          onChange={setField('stackNamePrefix')}
          data-test-subj="awsOnboardingFormStackNamePrefix"
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiButton
        type="submit"
        fill
        isLoading={save.isLoading}
        isDisabled={!isValid}
        data-test-subj="awsOnboardingFormSubmit"
      >
        {i18n.translate('xpack.fleet.awsOnboardingCredentialsForm.submit', {
          defaultMessage: 'Save credentials',
        })}
      </EuiButton>
    </EuiForm>
  );
};
