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

export function CreateDataSourceFlyoutTypeSettingsS3({
  control,
  unregister,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: regionField } = useController({
    name: 'settings.region',
    control,
  });
  const { field: endpointField } = useController({
    name: 'settings.endpoint',
    control,
  });

  useEffect(() => {
    return () => {
      unregister('settings.region');
      unregister('settings.endpoint');
    };
  }, [unregister]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.s3.fields.region', {
          defaultMessage: 'Region',
        })}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutS3Region"
          fullWidth
          autoComplete="off"
          value={regionField.value}
          onChange={(e) => regionField.onChange(e.target.value)}
          name={regionField.name}
          inputRef={regionField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.s3.fields.endpoint', {
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
    </>
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
          validate: (value: string) =>
            value?.trim()
              ? true
              : i18n.translate('dataSets.createFlyout.s3.fields.accessKeyRequired', {
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
          validate: (value: string) =>
            value?.trim()
              ? true
              : i18n.translate('dataSets.createFlyout.s3.fields.secretKeyRequired', {
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
        label={i18n.translate('dataSets.createFlyout.s3.fields.accessKey', {
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
        label={i18n.translate('dataSets.createFlyout.s3.fields.secretKey', {
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
