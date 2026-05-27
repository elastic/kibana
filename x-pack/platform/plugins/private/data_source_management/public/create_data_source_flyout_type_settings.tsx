/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldPassword,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';

import type { DataSourceType } from '../common/datasource_types';
import type { CreateDataSourceFlyoutFormSettings } from './create_data_source_flyout_form_state';
import { patchFormSettings } from './create_data_source_flyout_form_state';

export function CreateDataSourceFlyoutTypeSettings({
  dataSourceType,
  formSettings,
  onFormSettingsChange,
  disabled = false,
}: {
  dataSourceType: DataSourceType;
  formSettings: CreateDataSourceFlyoutFormSettings;
  onFormSettingsChange: (next: CreateDataSourceFlyoutFormSettings) => void;
  /** When true, all inputs are read-only (e.g. edit data source flyout body). */
  disabled?: boolean;
}) {
  const patch = (
    type: DataSourceType,
    patchIn: Partial<CreateDataSourceFlyoutFormSettings[typeof type]>
  ) => {
    onFormSettingsChange(patchFormSettings(formSettings, type, patchIn));
  };

  if (dataSourceType === 's3') {
    const v = formSettings.s3;
    return (
      <>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.s3.fields.region', {
            defaultMessage: 'Region',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.region}
            onChange={(e) => patch('s3', { region: e.target.value })}
            data-test-subj="createDataSourceFlyoutS3Region"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.s3.fields.endpoint', {
            defaultMessage: 'Endpoint',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.endpoint}
            onChange={(e) => patch('s3', { endpoint: e.target.value })}
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
            disabled={disabled}
            value={v.auth}
            onChange={(e) => patch('s3', { auth: e.target.value })}
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
            disabled={disabled}
            value={v.access_key}
            onChange={(e) => patch('s3', { access_key: e.target.value })}
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
            disabled={disabled}
            type="dual"
            value={v.secret_key}
            onChange={(e) => patch('s3', { secret_key: e.target.value })}
            data-test-subj="createDataSourceFlyoutS3SecretKey"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
      </>
    );
  }

  if (dataSourceType === 'gcs') {
    const v = formSettings.gcs;
    return (
      <>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.gcs.fields.projectId', {
            defaultMessage: 'Project ID',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.project_id}
            onChange={(e) => patch('gcs', { project_id: e.target.value })}
            data-test-subj="createDataSourceFlyoutGcsProjectId"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.gcs.fields.endpoint', {
            defaultMessage: 'Endpoint',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.endpoint}
            onChange={(e) => patch('gcs', { endpoint: e.target.value })}
            data-test-subj="createDataSourceFlyoutGcsEndpoint"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.gcs.fields.tokenUri', {
            defaultMessage: 'Token URI',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.token_uri}
            onChange={(e) => patch('gcs', { token_uri: e.target.value })}
            data-test-subj="createDataSourceFlyoutGcsTokenUri"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.gcs.fields.auth', {
            defaultMessage: 'Auth',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.auth}
            onChange={(e) => patch('gcs', { auth: e.target.value })}
            data-test-subj="createDataSourceFlyoutGcsAuth"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.gcs.fields.credentials', {
            defaultMessage: 'Credentials (JSON object)',
          })}
          fullWidth
        >
          <EuiTextArea
            disabled={disabled}
            value={v.credentialsJson}
            onChange={(e) => patch('gcs', { credentialsJson: e.target.value })}
            data-test-subj="createDataSourceFlyoutGcsCredentials"
            fullWidth
            rows={3}
            placeholder="{}"
            autoComplete="off"
          />
        </EuiFormRow>
      </>
    );
  }

  if (dataSourceType === 'azure_blob') {
    const v = formSettings.azure_blob;
    return (
      <>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.azureBlob.fields.endpoint', {
            defaultMessage: 'Endpoint',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.endpoint}
            onChange={(e) => patch('azure_blob', { endpoint: e.target.value })}
            data-test-subj="createDataSourceFlyoutAzureEndpoint"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.azureBlob.fields.account', {
            defaultMessage: 'Account',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.account}
            onChange={(e) => patch('azure_blob', { account: e.target.value })}
            data-test-subj="createDataSourceFlyoutAzureAccount"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.azureBlob.fields.auth', {
            defaultMessage: 'Auth',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.auth}
            onChange={(e) => patch('azure_blob', { auth: e.target.value })}
            data-test-subj="createDataSourceFlyoutAzureAuth"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'dataSourceManagement.createFlyout.azureBlob.fields.connectionString',
            {
              defaultMessage: 'Connection string',
            }
          )}
          fullWidth
        >
          <EuiFieldPassword
            disabled={disabled}
            type="dual"
            value={v.connection_string}
            onChange={(e) => patch('azure_blob', { connection_string: e.target.value })}
            data-test-subj="createDataSourceFlyoutAzureConnectionString"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.azureBlob.fields.key', {
            defaultMessage: 'Key',
          })}
          fullWidth
        >
          <EuiFieldPassword
            disabled={disabled}
            type="dual"
            value={v.key}
            onChange={(e) => patch('azure_blob', { key: e.target.value })}
            data-test-subj="createDataSourceFlyoutAzureKey"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.azureBlob.fields.sasToken', {
            defaultMessage: 'SAS token',
          })}
          fullWidth
        >
          <EuiFieldPassword
            disabled={disabled}
            type="dual"
            value={v.sas_token}
            onChange={(e) => patch('azure_blob', { sas_token: e.target.value })}
            data-test-subj="createDataSourceFlyoutAzureSasToken"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
      </>
    );
  }

  if (dataSourceType === 'iceberg') {
    const v = formSettings.iceberg;
    return (
      <>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.iceberg.fields.region', {
            defaultMessage: 'Region',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.region}
            onChange={(e) => patch('iceberg', { region: e.target.value })}
            data-test-subj="createDataSourceFlyoutIcebergRegion"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.iceberg.fields.endpoint', {
            defaultMessage: 'Endpoint',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.endpoint}
            onChange={(e) => patch('iceberg', { endpoint: e.target.value })}
            data-test-subj="createDataSourceFlyoutIcebergEndpoint"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.iceberg.fields.accessKey', {
            defaultMessage: 'Access key',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.access_key}
            onChange={(e) => patch('iceberg', { access_key: e.target.value })}
            data-test-subj="createDataSourceFlyoutIcebergAccessKey"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.iceberg.fields.secretKey', {
            defaultMessage: 'Secret key',
          })}
          fullWidth
        >
          <EuiFieldPassword
            disabled={disabled}
            type="dual"
            value={v.secret_key}
            onChange={(e) => patch('iceberg', { secret_key: e.target.value })}
            data-test-subj="createDataSourceFlyoutIcebergSecretKey"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
      </>
    );
  }

  if (dataSourceType === 'jdbc') {
    const v = formSettings.jdbc;
    return (
      <>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.jdbc.fields.host', {
            defaultMessage: 'Host',
          })}
          isInvalid={!disabled && !v.host.trim()}
          error={
            disabled || v.host.trim()
              ? undefined
              : i18n.translate('dataSourceManagement.createFlyout.jdbc.fields.hostRequired', {
                  defaultMessage: 'Host is required.',
                })
          }
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.host}
            onChange={(e) => patch('jdbc', { host: e.target.value })}
            data-test-subj="createDataSourceFlyoutJdbcHost"
            fullWidth
            isInvalid={!disabled && !v.host.trim()}
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.jdbc.fields.port', {
            defaultMessage: 'Port',
          })}
          isInvalid={!disabled && !v.port.trim()}
          error={
            disabled || v.port.trim()
              ? undefined
              : i18n.translate('dataSourceManagement.createFlyout.jdbc.fields.portRequired', {
                  defaultMessage: 'Port is required.',
                })
          }
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.port}
            onChange={(e) => patch('jdbc', { port: e.target.value })}
            data-test-subj="createDataSourceFlyoutJdbcPort"
            fullWidth
            isInvalid={!disabled && !v.port.trim()}
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.jdbc.fields.database', {
            defaultMessage: 'Database',
          })}
          isInvalid={!disabled && !v.database.trim()}
          error={
            disabled || v.database.trim()
              ? undefined
              : i18n.translate('dataSourceManagement.createFlyout.jdbc.fields.databaseRequired', {
                  defaultMessage: 'Database is required.',
                })
          }
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.database}
            onChange={(e) => patch('jdbc', { database: e.target.value })}
            data-test-subj="createDataSourceFlyoutJdbcDatabase"
            fullWidth
            isInvalid={!disabled && !v.database.trim()}
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow hasChildLabel hasEmptyLabelSpace fullWidth>
          <EuiSwitch
            disabled={disabled}
            label={i18n.translate('dataSourceManagement.createFlyout.jdbc.fields.ssl', {
              defaultMessage: 'SSL',
            })}
            checked={v.ssl}
            onChange={(e) => patch('jdbc', { ssl: e.target.checked })}
            data-test-subj="createDataSourceFlyoutJdbcSsl"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.jdbc.fields.username', {
            defaultMessage: 'Username',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.username}
            onChange={(e) => patch('jdbc', { username: e.target.value })}
            data-test-subj="createDataSourceFlyoutJdbcUsername"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.jdbc.fields.password', {
            defaultMessage: 'Password',
          })}
          fullWidth
        >
          <EuiFieldPassword
            disabled={disabled}
            type="dual"
            value={v.password}
            onChange={(e) => patch('jdbc', { password: e.target.value })}
            data-test-subj="createDataSourceFlyoutJdbcPassword"
            fullWidth
            autoComplete="off"
          />
        </EuiFormRow>
      </>
    );
  }

  if (dataSourceType === 'flight') {
    const v = formSettings.flight;
    return (
      <>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.flight.fields.host', {
            defaultMessage: 'Host',
          })}
          isInvalid={!disabled && !v.host.trim()}
          error={
            disabled || v.host.trim()
              ? undefined
              : i18n.translate('dataSourceManagement.createFlyout.flight.fields.hostRequired', {
                  defaultMessage: 'Host is required.',
                })
          }
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.host}
            onChange={(e) => patch('flight', { host: e.target.value })}
            data-test-subj="createDataSourceFlyoutFlightHost"
            fullWidth
            isInvalid={!disabled && !v.host.trim()}
            autoComplete="off"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('dataSourceManagement.createFlyout.flight.fields.port', {
            defaultMessage: 'Port',
          })}
          helpText={i18n.translate('dataSourceManagement.createFlyout.flight.fields.portHelp', {
            defaultMessage: 'Optional. Must be a whole number.',
          })}
          fullWidth
        >
          <EuiFieldText
            disabled={disabled}
            value={v.port}
            onChange={(e) => patch('flight', { port: e.target.value })}
            data-test-subj="createDataSourceFlyoutFlightPort"
            fullWidth
            type="text"
            inputMode="numeric"
            placeholder={i18n.translate(
              'dataSourceManagement.createFlyout.flight.fields.portOptional',
              {
                defaultMessage: 'Optional',
              }
            )}
            autoComplete="off"
          />
        </EuiFormRow>
      </>
    );
  }

  return null;
}

/**
 * Spacer + heading for the type-specific block (keeps the main flyout lean).
 */
export function CreateDataSourceFlyoutTypeSettingsBlock(props: {
  dataSourceType: DataSourceType;
  formSettings: CreateDataSourceFlyoutFormSettings;
  onFormSettingsChange: (next: CreateDataSourceFlyoutFormSettings) => void;
  disabled?: boolean;
}) {
  const { disabled = false, dataSourceType, formSettings, onFormSettingsChange } = props;
  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued" data-test-subj="createDataSourceFlyoutTypeSettingsHelp">
        {i18n.translate('dataSourceManagement.createFlyout.typeSettingsHelp', {
          defaultMessage: 'Connection settings for the selected data source type.',
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <CreateDataSourceFlyoutTypeSettings
        dataSourceType={dataSourceType}
        formSettings={formSettings}
        onFormSettingsChange={onFormSettingsChange}
        disabled={disabled}
      />
    </>
  );
}
