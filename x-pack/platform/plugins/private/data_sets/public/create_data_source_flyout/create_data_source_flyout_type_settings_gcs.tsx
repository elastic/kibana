/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText, EuiFormRow, EuiTextArea } from '@elastic/eui';

import type { UseFormUnregister } from 'react-hook-form';
import { type Control, useController } from 'react-hook-form';
import type { CreateDataSourceFlyoutFormValues } from './create_data_source_flyout_form_state';

export function CreateDataSourceFlyoutTypeSettingsGcs({
  control,
  unregister,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: projectIdField } = useController({
    defaultValue: '',
    name: 'settings.project_id',
    control,
  });
  const { field: endpointField } = useController({
    defaultValue: '',
    name: 'settings.endpoint',
    control,
  });
  const { field: tokenUriField } = useController({
    defaultValue: '',
    name: 'settings.token_uri',
    control,
  });

  useEffect(() => {
    return () => {
      unregister('settings.project_id');
      unregister('settings.endpoint');
      unregister('settings.token_uri');
    };
  }, [unregister]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.gcs.fields.projectId', {
          defaultMessage: 'Project ID',
        })}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutGcsProjectId"
          fullWidth
          autoComplete="off"
          value={projectIdField.value}
          onChange={(e) => projectIdField.onChange(e.target.value)}
          name={projectIdField.name}
          inputRef={projectIdField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.gcs.fields.endpoint', {
          defaultMessage: 'Endpoint',
        })}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutGcsEndpoint"
          fullWidth
          autoComplete="off"
          value={endpointField.value}
          onChange={(e) => endpointField.onChange(e.target.value)}
          name={endpointField.name}
          inputRef={endpointField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSets.createFlyout.gcs.fields.tokenUri', {
          defaultMessage: 'Token URI',
        })}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutGcsTokenUri"
          fullWidth
          autoComplete="off"
          value={tokenUriField.value}
          onChange={(e) => tokenUriField.onChange(e.target.value)}
          name={tokenUriField.name}
          inputRef={tokenUriField.ref}
        />
      </EuiFormRow>
    </>
  );
}

export function CreateDataSourceFlyoutTypeSettingsGcsCredentials({
  control,
  unregister,
}: {
  control: Control<CreateDataSourceFlyoutFormValues, any>;
  unregister: UseFormUnregister<CreateDataSourceFlyoutFormValues>;
}) {
  const { field: credentialsField } = useController({
    defaultValue: '',
    name: 'settings.credentials',
    control,
  });

  useEffect(() => {
    return () => {
      unregister('settings.credentials');
    };
  }, [unregister]);

  return (
    <EuiFormRow
      label={i18n.translate('dataSets.createFlyout.gcs.fields.credentials', {
        defaultMessage: 'Credentials',
      })}
      fullWidth
    >
      <EuiTextArea
        data-test-subj="createDataSourceFlyoutGcsCredentials"
        fullWidth
        rows={3}
        autoComplete="off"
        value={credentialsField.value ?? ''}
        onChange={(e) => credentialsField.onChange(e.target.value)}
        name={credentialsField.name}
        inputRef={credentialsField.ref}
      />
    </EuiFormRow>
  );
}
