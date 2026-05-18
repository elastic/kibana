/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  Field,
  PasswordField,
  TextAreaField,
  ToggleField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import type { EsqlExternalDataSourceKind } from './data_source_kind';

const { emptyField } = fieldValidators;

function textFieldProps(readOnly: boolean) {
  return {
    euiFieldProps: {
      readOnly,
      fullWidth: true,
      autoComplete: 'off' as const,
    },
  };
}

function passwordFieldProps(readOnly: boolean, testSubj: string) {
  return {
    euiFieldProps: {
      readOnly,
      fullWidth: true,
      autoComplete: 'off' as const,
      'data-test-subj': testSubj,
    },
  };
}

export const EsqlExternalDataSourceTypeFields: React.FC<{
  kind: EsqlExternalDataSourceKind;
  readOnly: boolean;
}> = ({ kind, readOnly }) => {
  const tp = textFieldProps(readOnly);

  switch (kind) {
    case 's3':
      return (
        <Fragment>
          <UseField
            path="config.s3_region"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.s3.region',
                {
                  defaultMessage: 'Region',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.s3_endpoint"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.s3.endpoint',
                {
                  defaultMessage: 'Endpoint',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.s3_auth"
            component={Field}
            config={{
              label: i18n.translate('xpack.stackConnectors.esqlExternalDataSource.fields.s3.auth', {
                defaultMessage: 'Auth',
              }),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="secrets.s3_access_key"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.s3.accessKey',
                {
                  defaultMessage: 'Access key',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="secrets.s3_secret_key"
            component={PasswordField}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.s3.secretKey',
                {
                  defaultMessage: 'Secret key',
                }
              ),
              defaultValue: '',
            }}
            componentProps={passwordFieldProps(readOnly, 'esqlExtDsS3SecretKey')}
          />
        </Fragment>
      );
    case 'gcs':
      return (
        <Fragment>
          <UseField
            path="config.gcs_project_id"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.gcs.projectId',
                {
                  defaultMessage: 'Project ID',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.gcs_endpoint"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.gcs.endpoint',
                {
                  defaultMessage: 'Endpoint',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.gcs_token_uri"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.gcs.tokenUri',
                {
                  defaultMessage: 'Token URI',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.gcs_auth"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.gcs.auth',
                {
                  defaultMessage: 'Auth',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="secrets.gcs_credentials_json"
            component={TextAreaField}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.gcs.credentials',
                {
                  defaultMessage: 'Credentials (JSON object)',
                }
              ),
              defaultValue: '',
            }}
            componentProps={{
              euiFieldProps: {
                readOnly,
                fullWidth: true,
                rows: 3,
                placeholder: '{}',
                autoComplete: 'off',
                'data-test-subj': 'esqlExtDsGcsCredentials',
              },
            }}
          />
        </Fragment>
      );
    case 'azure_blob':
      return (
        <Fragment>
          <UseField
            path="config.azure_endpoint"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.azure.endpoint',
                {
                  defaultMessage: 'Endpoint',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.azure_account"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.azure.account',
                {
                  defaultMessage: 'Account',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.azure_auth"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.azure.auth',
                {
                  defaultMessage: 'Auth',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="secrets.azure_connection_string"
            component={PasswordField}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.azure.connectionString',
                {
                  defaultMessage: 'Connection string',
                }
              ),
              defaultValue: '',
            }}
            componentProps={passwordFieldProps(readOnly, 'esqlExtDsAzureConnString')}
          />
          <EuiSpacer size="m" />
          <UseField
            path="secrets.azure_key"
            component={PasswordField}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.azure.key',
                {
                  defaultMessage: 'Key',
                }
              ),
              defaultValue: '',
            }}
            componentProps={passwordFieldProps(readOnly, 'esqlExtDsAzureKey')}
          />
          <EuiSpacer size="m" />
          <UseField
            path="secrets.azure_sas_token"
            component={PasswordField}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.azure.sasToken',
                {
                  defaultMessage: 'SAS token',
                }
              ),
              defaultValue: '',
            }}
            componentProps={passwordFieldProps(readOnly, 'esqlExtDsAzureSas')}
          />
        </Fragment>
      );
    case 'iceberg':
      return (
        <Fragment>
          <UseField
            path="config.iceberg_region"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.iceberg.region',
                {
                  defaultMessage: 'Region',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.iceberg_endpoint"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.iceberg.endpoint',
                {
                  defaultMessage: 'Endpoint',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.iceberg_access_key"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.iceberg.accessKey',
                {
                  defaultMessage: 'Access key',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="secrets.iceberg_secret_key"
            component={PasswordField}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.iceberg.secretKey',
                {
                  defaultMessage: 'Secret key',
                }
              ),
              defaultValue: '',
            }}
            componentProps={passwordFieldProps(readOnly, 'esqlExtDsIcebergSecret')}
          />
        </Fragment>
      );
    case 'jdbc':
      return (
        <Fragment>
          <UseField
            path="config.jdbc_host"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.jdbc.host',
                {
                  defaultMessage: 'Host',
                }
              ),
              defaultValue: '',
              validations: [
                {
                  validator: emptyField(
                    i18n.translate(
                      'xpack.stackConnectors.esqlExternalDataSource.validation.jdbcHostRequired',
                      { defaultMessage: 'Host is required.' }
                    )
                  ),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                readOnly,
                fullWidth: true,
                autoComplete: 'off',
                'data-test-subj': 'esqlExtDsJdbcHost',
              },
            }}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.jdbc_port"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.jdbc.port',
                {
                  defaultMessage: 'Port',
                }
              ),
              defaultValue: '',
              validations: [
                {
                  validator: emptyField(
                    i18n.translate(
                      'xpack.stackConnectors.esqlExternalDataSource.validation.jdbcPortRequired',
                      { defaultMessage: 'Port is required.' }
                    )
                  ),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                readOnly,
                fullWidth: true,
                autoComplete: 'off',
                'data-test-subj': 'esqlExtDsJdbcPort',
              },
            }}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.jdbc_database"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.jdbc.database',
                {
                  defaultMessage: 'Database',
                }
              ),
              defaultValue: '',
              validations: [
                {
                  validator: emptyField(
                    i18n.translate(
                      'xpack.stackConnectors.esqlExternalDataSource.validation.jdbcDatabaseRequired',
                      { defaultMessage: 'Database is required.' }
                    )
                  ),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                readOnly,
                fullWidth: true,
                autoComplete: 'off',
                'data-test-subj': 'esqlExtDsJdbcDatabase',
              },
            }}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.jdbc_ssl"
            component={ToggleField}
            config={{
              defaultValue: false,
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.jdbc.ssl',
                {
                  defaultMessage: 'SSL',
                }
              ),
            }}
            componentProps={{
              euiFieldProps: {
                disabled: readOnly,
                'data-test-subj': 'esqlExtDsJdbcSsl',
              },
            }}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.jdbc_username"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.jdbc.username',
                {
                  defaultMessage: 'Username',
                }
              ),
              defaultValue: '',
            }}
            componentProps={tp}
          />
          <EuiSpacer size="m" />
          <UseField
            path="secrets.jdbc_password"
            component={PasswordField}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.jdbc.password',
                {
                  defaultMessage: 'Password',
                }
              ),
              defaultValue: '',
            }}
            componentProps={passwordFieldProps(readOnly, 'esqlExtDsJdbcPassword')}
          />
        </Fragment>
      );
    case 'flight':
      return (
        <Fragment>
          <UseField
            path="config.flight_host"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.flight.host',
                {
                  defaultMessage: 'Host',
                }
              ),
              defaultValue: '',
              validations: [
                {
                  validator: emptyField(
                    i18n.translate(
                      'xpack.stackConnectors.esqlExternalDataSource.validation.flightHostRequired',
                      { defaultMessage: 'Host is required.' }
                    )
                  ),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                readOnly,
                fullWidth: true,
                autoComplete: 'off',
                'data-test-subj': 'esqlExtDsFlightHost',
              },
            }}
          />
          <EuiSpacer size="m" />
          <UseField
            path="config.flight_port"
            component={Field}
            config={{
              label: i18n.translate(
                'xpack.stackConnectors.esqlExternalDataSource.fields.flight.port',
                {
                  defaultMessage: 'Port',
                }
              ),
              defaultValue: '',
            }}
            componentProps={{
              euiFieldProps: {
                readOnly,
                fullWidth: true,
                autoComplete: 'off',
                'data-test-subj': 'esqlExtDsFlightPort',
              },
            }}
          />
        </Fragment>
      );
    default:
      return null;
  }
};
