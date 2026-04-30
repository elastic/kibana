/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText, EuiFormRow, EuiTextArea } from '@elastic/eui';

import { type Control, useController } from 'react-hook-form';
import type { DataSourceWithSecrets } from '../common/datasource_types';

export function CreateDataSourceFlyoutTypeSettingsGcs({
  control,
}: {
  control: Control<DataSourceWithSecrets, any>;
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
  const { field: authField } = useController({
    defaultValue: '',
    name: 'settings.auth',
    control,
  });
  const { field: credentialsField } = useController({
    defaultValue: undefined,
    name: 'settings.credentials',
    control,
  });

  const [credentialsDraft, setCredentialsDraft] = useState('');
  useEffect(() => {
    const v = credentialsField.value;
    if (v === undefined || v === null) {
      setCredentialsDraft('');
    } else if (typeof v === 'object') {
      setCredentialsDraft(JSON.stringify(v));
    } else {
      setCredentialsDraft(String(v));
    }
  }, [credentialsField.value]);

  const onCredentialsBlur = () => {
    const raw = credentialsDraft.trim();
    if (!raw) {
      credentialsField.onChange(undefined);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        credentialsField.onChange(parsed as Record<string, unknown>);
      }
    } catch {
      // Invalid JSON: keep draft; user can fix and blur again.
    }
  };

  return (
    <>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.gcs.fields.projectId', {
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
        label={i18n.translate('dataSourceManagement.createFlyout.gcs.fields.endpoint', {
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
        label={i18n.translate('dataSourceManagement.createFlyout.gcs.fields.tokenUri', {
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
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.gcs.fields.auth', {
          defaultMessage: 'Auth',
        })}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDataSourceFlyoutGcsAuth"
          fullWidth
          autoComplete="off"
          value={authField.value}
          onChange={(e) => authField.onChange(e.target.value)}
          name={authField.name}
          inputRef={authField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('dataSourceManagement.createFlyout.gcs.fields.credentials', {
          defaultMessage: 'Credentials (JSON object)',
        })}
        fullWidth
      >
        <EuiTextArea
          data-test-subj="createDataSourceFlyoutGcsCredentials"
          fullWidth
          rows={3}
          placeholder="{}"
          autoComplete="off"
          value={credentialsDraft}
          onChange={(e) => setCredentialsDraft(e.target.value)}
          onBlur={onCredentialsBlur}
          name={credentialsField.name}
          inputRef={credentialsField.ref}
        />
      </EuiFormRow>
    </>
  );
}
