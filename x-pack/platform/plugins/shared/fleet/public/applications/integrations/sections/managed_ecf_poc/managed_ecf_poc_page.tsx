/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPageTemplate,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { API_VERSIONS, CREATE_MANAGED_ECF_DEPLOYMENT_ROUTE } from '../../../../../common/constants';
import { useKibanaVersion, useStartServices } from '../../../../hooks';

type InputType = 'cloudtrail' | 'crowdstrike_fdr';
type Interval = '1m' | '2m' | '5m' | '10m';

interface FormState {
  policyId: string;
  inputType: InputType;
  dataset: string;
  interval: Interval;
  region: string;
  sqsQueueUrl: string;
  motelEndpoint: string;
  awsKey: string;
  awsSecret: string;
  awsToken: string;
}

interface AgentlessApiResponse {
  code: string;
  error: string | null;
}

const initialState: FormState = {
  policyId: '',
  inputType: 'cloudtrail',
  dataset: 'aws.cloudtrail',
  interval: '1m',
  region: 'eu-west-1',
  sqsQueueUrl: '',
  motelEndpoint: '',
  awsKey: '',
  awsSecret: '',
  awsToken: '',
};

const required = i18n.translate('xpack.fleet.managedEcfPoc.requiredLabel', {
  defaultMessage: 'Required',
});

const labels = {
  policyId: i18n.translate('xpack.fleet.managedEcfPoc.policyIdLabel', {
    defaultMessage: 'Policy ID',
  }),
  inputType: i18n.translate('xpack.fleet.managedEcfPoc.inputTypeLabel', {
    defaultMessage: 'Input type',
  }),
  cloudtrail: i18n.translate('xpack.fleet.managedEcfPoc.cloudtrailOption', {
    defaultMessage: 'CloudTrail',
  }),
  crowdstrikeFdr: i18n.translate('xpack.fleet.managedEcfPoc.crowdstrikeFdrOption', {
    defaultMessage: 'CrowdStrike FDR',
  }),
  dataset: i18n.translate('xpack.fleet.managedEcfPoc.datasetLabel', {
    defaultMessage: 'Dataset',
  }),
  interval: i18n.translate('xpack.fleet.managedEcfPoc.intervalLabel', {
    defaultMessage: 'Polling interval',
  }),
  region: i18n.translate('xpack.fleet.managedEcfPoc.regionLabel', {
    defaultMessage: 'AWS region',
  }),
  queueUrl: i18n.translate('xpack.fleet.managedEcfPoc.queueUrlLabel', {
    defaultMessage: 'SQS queue URL',
  }),
  motelEndpoint: i18n.translate('xpack.fleet.managedEcfPoc.motelEndpointLabel', {
    defaultMessage: 'Managed OTLP endpoint',
  }),
  awsKey: i18n.translate('xpack.fleet.managedEcfPoc.awsKeyLabel', {
    defaultMessage: 'AWS access key ID',
  }),
  awsSecret: i18n.translate('xpack.fleet.managedEcfPoc.awsSecretLabel', {
    defaultMessage: 'AWS secret access key',
  }),
  awsToken: i18n.translate('xpack.fleet.managedEcfPoc.awsTokenLabel', {
    defaultMessage: 'AWS session token',
  }),
  awsPairError: i18n.translate('xpack.fleet.managedEcfPoc.awsPairError', {
    defaultMessage: 'Access key ID and secret must be provided together.',
  }),
  submit: i18n.translate('xpack.fleet.managedEcfPoc.submitButton', {
    defaultMessage: 'Create ReaderSource',
  }),
  preview: i18n.translate('xpack.fleet.managedEcfPoc.previewTitle', {
    defaultMessage: 'Agentless API payload preview',
  }),
  success: i18n.translate('xpack.fleet.managedEcfPoc.successTitle', {
    defaultMessage: 'ReaderSource request accepted',
  }),
  failure: i18n.translate('xpack.fleet.managedEcfPoc.failureTitle', {
    defaultMessage: 'Request failed',
  }),
};

export const ManagedEcfPocPage = (): React.ReactElement => {
  const { http } = useStartServices();
  const kibanaVersion = useKibanaVersion();
  const [form, setForm] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responseBody, setResponseBody] = useState<AgentlessApiResponse>();
  const [error, setError] = useState<string>();

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const awsCredentialsArePaired = Boolean(form.awsKey) === Boolean(form.awsSecret);
  const requiredFieldsArePresent = Boolean(
    form.policyId && form.dataset && form.region && form.sqsQueueUrl && form.motelEndpoint
  );
  const isValid = requiredFieldsArePresent && awsCredentialsArePaired;

  const requestBody = useMemo(() => {
    return {
      policy_id: form.policyId,
      managed_ecf: {
        input_type: form.inputType,
        dataset: form.dataset,
        interval: form.interval,
        region: form.region,
        sqs_queue_url: form.sqsQueueUrl,
        motel_endpoint: form.motelEndpoint,
      },
      managed_ecf_secrets: {
        ...(form.awsKey ? { aws_key: form.awsKey } : {}),
        ...(form.awsSecret ? { aws_secret: form.awsSecret } : {}),
        ...(form.awsToken ? { aws_token: form.awsToken } : {}),
      },
    };
  }, [form]);

  const forwardedPayloadPreview = useMemo(
    () => ({
      ...requestBody,
      config_mode: 'managed_ecf',
      stack_version: kibanaVersion,
      is_elastic_staff_owned: false,
      managed_ecf_secrets: {
        ...(form.awsKey ? { aws_key: '[REDACTED]' } : {}),
        ...(form.awsSecret ? { aws_secret: '[REDACTED]' } : {}),
        ...(form.awsToken ? { aws_token: '[REDACTED]' } : {}),
        motel_api_key: '[AUTO-GENERATED]',
      },
    }),
    [form, kibanaVersion, requestBody]
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setResponseBody(undefined);
    setError(undefined);
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const result = await http.post<AgentlessApiResponse>(CREATE_MANAGED_ECF_DEPLOYMENT_ROUTE, {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify(requestBody),
      });
      setResponseBody(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EuiPageTemplate restrictWidth={1200}>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.fleet.managedEcfPoc.title', {
          defaultMessage: 'Managed ECF POC',
        })}
        description={i18n.translate('xpack.fleet.managedEcfPoc.description', {
          defaultMessage: 'Send an S3/SQS reader configuration to agentless-api.',
        })}
      />
      <EuiPageTemplate.Section>
        <EuiForm component="form" onSubmit={submit}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                label={labels.policyId}
                helpText={required}
                isInvalid={submitted && !form.policyId}
              >
                <EuiFieldText
                  value={form.policyId}
                  onChange={(e) => setField('policyId', e.target.value)}
                  isInvalid={submitted && !form.policyId}
                  fullWidth
                />
              </EuiFormRow>
              <EuiFormRow label={labels.inputType}>
                <EuiSelect
                  value={form.inputType}
                  onChange={(e) => setField('inputType', e.target.value as InputType)}
                  options={[
                    { value: 'cloudtrail', text: labels.cloudtrail },
                    { value: 'crowdstrike_fdr', text: labels.crowdstrikeFdr },
                  ]}
                  fullWidth
                />
              </EuiFormRow>
              <EuiFormRow label={labels.dataset} helpText={required}>
                <EuiFieldText
                  value={form.dataset}
                  onChange={(e) => setField('dataset', e.target.value)}
                  fullWidth
                />
              </EuiFormRow>
              <EuiFormRow label={labels.interval}>
                <EuiSelect
                  value={form.interval}
                  onChange={(e) => setField('interval', e.target.value as Interval)}
                  options={['1m', '2m', '5m', '10m'].map((value) => ({ value, text: value }))}
                  fullWidth
                />
              </EuiFormRow>
              <EuiFormRow label={labels.region} helpText={required}>
                <EuiFieldText
                  value={form.region}
                  onChange={(e) => setField('region', e.target.value)}
                  fullWidth
                />
              </EuiFormRow>
              <EuiFormRow label={labels.queueUrl} helpText={required}>
                <EuiFieldText
                  value={form.sqsQueueUrl}
                  onChange={(e) => setField('sqsQueueUrl', e.target.value)}
                  fullWidth
                />
              </EuiFormRow>
              <EuiFormRow label={labels.motelEndpoint} helpText={required}>
                <EuiFieldText
                  value={form.motelEndpoint}
                  onChange={(e) => setField('motelEndpoint', e.target.value)}
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={labels.awsKey}
                error={!awsCredentialsArePaired ? labels.awsPairError : undefined}
                isInvalid={submitted && !awsCredentialsArePaired}
              >
                <EuiFieldPassword
                  type="dual"
                  value={form.awsKey}
                  onChange={(e) => setField('awsKey', e.target.value)}
                  isInvalid={submitted && !awsCredentialsArePaired}
                  fullWidth
                />
              </EuiFormRow>
              <EuiFormRow
                label={labels.awsSecret}
                isInvalid={submitted && !awsCredentialsArePaired}
              >
                <EuiFieldPassword
                  type="dual"
                  value={form.awsSecret}
                  onChange={(e) => setField('awsSecret', e.target.value)}
                  isInvalid={submitted && !awsCredentialsArePaired}
                  fullWidth
                />
              </EuiFormRow>
              <EuiFormRow label={labels.awsToken}>
                <EuiFieldPassword
                  type="dual"
                  value={form.awsToken}
                  onChange={(e) => setField('awsToken', e.target.value)}
                  fullWidth
                />
              </EuiFormRow>
              <EuiSpacer />
              <EuiButton type="submit" fill isLoading={isSubmitting} disabled={isSubmitting}>
                {labels.submit}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>

        <EuiSpacer size="xl" />
        <EuiTitle size="s">
          <h2>{labels.preview}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiCodeBlock language="json" isCopyable>
          {JSON.stringify(forwardedPayloadPreview, null, 2)}
        </EuiCodeBlock>

        {responseBody !== undefined && (
          <>
            <EuiSpacer />
            <EuiCallOut announceOnMount title={labels.success} color="success" iconType="check">
              <EuiCodeBlock language="json">{JSON.stringify(responseBody, null, 2)}</EuiCodeBlock>
            </EuiCallOut>
          </>
        )}
        {error && (
          <>
            <EuiSpacer />
            <EuiCallOut announceOnMount title={labels.failure} color="danger" iconType="error">
              <p>{error}</p>
            </EuiCallOut>
          </>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
