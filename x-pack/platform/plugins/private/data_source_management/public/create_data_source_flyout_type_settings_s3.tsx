/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldPassword, EuiFieldText, EuiFormRow } from '@elastic/eui';

import { type Control, useController } from 'react-hook-form';
import type { DataSourceWithSecrets } from '../common/datasource_types';
import type { CreateDataSourceFlyoutFormSettings } from './create_data_source_flyout_form_state';

export function CreateDataSourceFlyoutTypeSettingsS3({
  values,
  onPatch,
  control,
}: {
  values: CreateDataSourceFlyoutFormSettings['s3'];
  onPatch: (patch: Partial<CreateDataSourceFlyoutFormSettings['s3']>) => void;
  control: Control<DataSourceWithSecrets, any>;
}) {
  const { field: regionField } = useController({
    defaultValue: '',
    name: 'settings.region',
    control,
  });

  return (
    <>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.s3.fields.region', {
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
        label={i18n.translate('dataSourceManagement.createFlyout.s3.fields.endpoint', {
          defaultMessage: 'Endpoint',
        })}
        fullWidth
      >
        <EuiFieldText
          value={values.endpoint}
          onChange={(e) => onPatch({ endpoint: e.target.value })}
          data-test-subj="createDataSourceFlyoutS3Endpoint"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.s3.fields.auth', {
          defaultMessage: 'Auth',
        })}
        fullWidth
      >
        <EuiFieldText
          value={values.auth}
          onChange={(e) => onPatch({ auth: e.target.value })}
          data-test-subj="createDataSourceFlyoutS3Auth"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.s3.fields.accessKey', {
          defaultMessage: 'Access key',
        })}
        fullWidth
      >
        <EuiFieldText
          value={values.access_key}
          onChange={(e) => onPatch({ access_key: e.target.value })}
          data-test-subj="createDataSourceFlyoutS3AccessKey"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.s3.fields.secretKey', {
          defaultMessage: 'Secret key',
        })}
        fullWidth
      >
        <EuiFieldPassword
          type="dual"
          value={values.secret_key}
          onChange={(e) => onPatch({ secret_key: e.target.value })}
          data-test-subj="createDataSourceFlyoutS3SecretKey"
          fullWidth
          autoComplete="off"
        />
      </EuiFormRow>
    </>
  );
}
