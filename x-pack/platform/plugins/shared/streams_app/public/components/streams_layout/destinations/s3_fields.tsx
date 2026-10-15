/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';
import {
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AMAZON_S3_LABEL } from './destination_type_config';
import type { S3DestinationFormData, S3DestinationFormErrors } from './types';

type S3Field = keyof S3DestinationFormData;

interface S3FieldsProps {
  values: S3DestinationFormData;
  errors: S3DestinationFormErrors;
  disabled: boolean;
  onChange: (changes: Partial<S3DestinationFormData>) => void;
  onBlur: () => void;
}

const providerOption = (
  value: string,
  iconType: string,
  label: string,
  disabled = false
): EuiSuperSelectOption<string> => ({
  value,
  disabled,
  inputDisplay: (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>{label}</EuiFlexItem>
    </EuiFlexGroup>
  ),
});

const PROVIDER_OPTIONS: Array<EuiSuperSelectOption<string>> = [
  providerOption('s3', 'logoAWS', AMAZON_S3_LABEL),
  providerOption(
    'azure_blob',
    'logoAzure',
    i18n.translate('xpack.streams.destinations.s3ProviderAzureBlobLabel', {
      defaultMessage: 'Azure Blob',
    }),
    true
  ),
  providerOption(
    'google_cloud',
    'logoGCP',
    i18n.translate('xpack.streams.destinations.s3ProviderGoogleCloudLabel', {
      defaultMessage: 'Google Cloud',
    }),
    true
  ),
  providerOption(
    'kafka',
    'logoKafka',
    i18n.translate('xpack.streams.destinations.s3ProviderKafkaLabel', {
      defaultMessage: 'Kafka',
    }),
    true
  ),
];

const FIELDS: ReadonlyArray<{
  field: S3Field;
  label: string;
  helpText?: string;
  placeholder?: string;
  requiredMessage: string;
  testSubject: string;
}> = [
  {
    field: 'region',
    label: i18n.translate('xpack.streams.destinations.s3RegionLabel', {
      defaultMessage: 'Region',
    }),
    helpText: i18n.translate('xpack.streams.destinations.s3RegionHelpDescription', {
      defaultMessage: 'AWS region of the bucket.',
    }),
    placeholder: 'us-east-1',
    requiredMessage: i18n.translate('xpack.streams.destinations.s3RegionRequiredErrorMessage', {
      defaultMessage: 'Enter the AWS region.',
    }),
    testSubject: 'streamsCreateDestinationS3Region',
  },
  {
    field: 'bucket',
    label: i18n.translate('xpack.streams.destinations.s3BucketLabel', {
      defaultMessage: 'Bucket',
    }),
    helpText: i18n.translate('xpack.streams.destinations.s3BucketHelpDescription', {
      defaultMessage: 'The S3 bucket data is written to.',
    }),
    requiredMessage: i18n.translate('xpack.streams.destinations.s3BucketRequiredErrorMessage', {
      defaultMessage: 'Enter a bucket name.',
    }),
    testSubject: 'streamsCreateDestinationS3Bucket',
  },
  {
    field: 'accessKey',
    label: i18n.translate('xpack.streams.destinations.s3AccessKeyLabel', {
      defaultMessage: 'Access key ID',
    }),
    requiredMessage: i18n.translate('xpack.streams.destinations.s3AccessKeyRequiredErrorMessage', {
      defaultMessage: 'Enter an access key ID.',
    }),
    testSubject: 'streamsCreateDestinationS3AccessKey',
  },
  {
    field: 'secret',
    label: i18n.translate('xpack.streams.destinations.s3SecretLabel', {
      defaultMessage: 'Secret access key',
    }),
    requiredMessage: i18n.translate('xpack.streams.destinations.s3SecretRequiredErrorMessage', {
      defaultMessage: 'Enter a secret access key.',
    }),
    testSubject: 'streamsCreateDestinationS3Secret',
  },
];

/** Fields for an Amazon S3 destination. Errors show once a field has been left. */
export const S3Fields = ({ values, errors, disabled, onChange, onBlur }: S3FieldsProps) => {
  const [touched, setTouched] = useState<ReadonlySet<S3Field>>(new Set());

  return (
    <>
      <EuiFormRow fullWidth>
        <EuiSuperSelect
          fullWidth
          aria-label={i18n.translate('xpack.streams.destinations.s3ProviderLabel', {
            defaultMessage: 'Provider',
          })}
          options={PROVIDER_OPTIONS}
          valueOfSelected="s3"
          onChange={() => undefined}
          disabled={disabled}
          data-test-subj="streamsCreateDestinationS3Provider"
        />
      </EuiFormRow>
      {FIELDS.map(({ field, label, helpText, placeholder, requiredMessage, testSubject }) => {
        const errorMessage = touched.has(field) && errors[field] ? requiredMessage : undefined;
        const inputProps = {
          fullWidth: true,
          value: values[field],
          placeholder,
          disabled,
          isInvalid: Boolean(errorMessage),
          onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ [field]: event.target.value }),
          onBlur: () => {
            setTouched((previous) => new Set(previous).add(field));
            onBlur();
          },
          'data-test-subj': testSubject,
        };
        return (
          <EuiFormRow
            key={field}
            fullWidth
            label={label}
            helpText={helpText}
            isInvalid={Boolean(errorMessage)}
            error={errorMessage}
          >
            {field === 'secret' ? (
              <EuiFieldPassword {...inputProps} type="dual" autoComplete="new-password" />
            ) : (
              <EuiFieldText {...inputProps} autoComplete="off" />
            )}
          </EuiFormRow>
        );
      })}
    </>
  );
};
