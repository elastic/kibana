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
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: accessKeyField } = useController({
    name: 'settings.access_key',
    control,
  });
  const { field: secretKeyField } = useController({
    name: 'settings.secret_key',
    control,
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
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutS3AccessKey"
          fullWidth
          autoComplete="off"
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
      >
        <EuiFieldPassword
          type="dual"
          data-test-subj="createDataSourceFlyoutS3SecretKey"
          fullWidth
          autoComplete="off"
          value={secretKeyField.value}
          onChange={(e) => secretKeyField.onChange(e.target.value)}
          name={secretKeyField.name}
          inputRef={secretKeyField.ref}
        />
      </EuiFormRow>
    </>
  );
}
