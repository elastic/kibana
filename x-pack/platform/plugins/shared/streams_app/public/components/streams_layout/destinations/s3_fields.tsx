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
  EuiIconTip,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AMAZON_S3_LABEL } from './destination_type_config';
import type { S3DestinationFormData, S3FieldsErrors } from './types';

type S3Field = keyof S3DestinationFormData;

interface S3FieldsProps {
  values: S3DestinationFormData;
  errors: S3FieldsErrors;
  disabled: boolean;
  onChange: (changes: Partial<S3DestinationFormData>) => void;
  onBlur: () => void;
}

const PROVIDER_OPTIONS: Array<EuiSuperSelectOption<string>> = [
  {
    value: 's3',
    inputDisplay: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="logoAWS" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>{AMAZON_S3_LABEL}</EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
];

const OPTIONAL_LABEL = i18n.translate('xpack.streams.destinations.s3OptionalLabel', {
  defaultMessage: 'Optional',
});

const PROVIDER_LABEL = i18n.translate('xpack.streams.destinations.s3ProviderLabel', {
  defaultMessage: 'Provider',
});

const BUCKET_ERROR_MESSAGES: Record<NonNullable<S3FieldsErrors['bucket']>, string> = {
  required: i18n.translate('xpack.streams.destinations.s3BucketRequiredErrorMessage', {
    defaultMessage: 'Enter a bucket name.',
  }),
  invalid: i18n.translate('xpack.streams.destinations.s3BucketInvalidErrorMessage', {
    defaultMessage: 'Bucket names are 3 to 63 characters.',
  }),
};

const FIELDS: ReadonlyArray<{
  field: S3Field;
  label: string;
  helpText?: string;
  optional?: boolean;
  placeholder?: string;
  getErrorMessage?: (errors: S3FieldsErrors) => string | undefined;
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
    getErrorMessage: ({ region }) =>
      region
        ? i18n.translate('xpack.streams.destinations.s3RegionRequiredErrorMessage', {
            defaultMessage: 'Enter the AWS region.',
          })
        : undefined,
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
    getErrorMessage: ({ bucket }) => (bucket ? BUCKET_ERROR_MESSAGES[bucket] : undefined),
    testSubject: 'streamsCreateDestinationS3Bucket',
  },
  {
    field: 'prefix',
    label: i18n.translate('xpack.streams.destinations.s3PrefixLabel', {
      defaultMessage: 'Prefix',
    }),
    helpText: i18n.translate('xpack.streams.destinations.s3PrefixHelpDescription', {
      defaultMessage: 'Key prefix. Time partitions and object names are appended.',
    }),
    optional: true,
    testSubject: 'streamsCreateDestinationS3Prefix',
  },
  {
    field: 'accessKeyId',
    label: i18n.translate('xpack.streams.destinations.s3AccessKeyIdLabel', {
      defaultMessage: 'Access key ID',
    }),
    getErrorMessage: ({ accessKeyId }) =>
      accessKeyId
        ? i18n.translate('xpack.streams.destinations.s3AccessKeyIdRequiredErrorMessage', {
            defaultMessage: 'Enter an access key ID.',
          })
        : undefined,
    testSubject: 'streamsCreateDestinationS3AccessKeyId',
  },
  {
    field: 'secretAccessKey',
    label: i18n.translate('xpack.streams.destinations.s3SecretAccessKeyLabel', {
      defaultMessage: 'Secret access key',
    }),
    getErrorMessage: ({ secretAccessKey }) =>
      secretAccessKey
        ? i18n.translate('xpack.streams.destinations.s3SecretAccessKeyRequiredErrorMessage', {
            defaultMessage: 'Enter a secret access key.',
          })
        : undefined,
    testSubject: 'streamsCreateDestinationS3SecretAccessKey',
  },
];

/** Fields for an Amazon S3 destination (`s3.schema.yaml`). */
export const S3Fields = ({ values, errors, disabled, onChange, onBlur }: S3FieldsProps) => {
  const [touched, setTouched] = useState<ReadonlySet<S3Field>>(new Set());

  return (
    <>
      <EuiFormRow fullWidth label={PROVIDER_LABEL}>
        <EuiSuperSelect
          fullWidth
          options={PROVIDER_OPTIONS}
          valueOfSelected="s3"
          onChange={() => undefined}
          disabled={disabled}
          data-test-subj="streamsCreateDestinationS3Provider"
        />
      </EuiFormRow>
      {FIELDS.map(
        ({ field, label, helpText, optional, placeholder, getErrorMessage, testSubject }) => {
          const errorMessage = touched.has(field) ? getErrorMessage?.(errors) : undefined;
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
              label={
                helpText ? (
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>{label}</EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIconTip content={helpText} type="question" size="s" color="subdued" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : (
                  label
                )
              }
              labelAppend={
                optional ? (
                  <EuiText size="xs" color="subdued">
                    {OPTIONAL_LABEL}
                  </EuiText>
                ) : undefined
              }
              isInvalid={Boolean(errorMessage)}
              error={errorMessage}
            >
              {field === 'secretAccessKey' ? (
                <EuiFieldPassword {...inputProps} type="dual" autoComplete="new-password" />
              ) : (
                <EuiFieldText {...inputProps} autoComplete="off" />
              )}
            </EuiFormRow>
          );
        }
      )}
    </>
  );
};
