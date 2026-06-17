/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceType, DataSourceWithSecrets } from '../../common/datasource_types';

/** React-hook-form values; data source `type` is flyout UI state, not a form field. */
export type CreateDataSourceFlyoutFormValues = Omit<DataSourceWithSecrets, 'type'>;

/**
 * In-memory form values for the create flyout, keyed by data source type.
 * Values are string where the domain type is optional or string; JDBC / Flight
 * include required string fields for validation before save.
 */
export interface CreateDataSourceFlyoutFormSettings {
  s3: {
    region: string;
    endpoint: string;
    auth: string;
    access_key: string;
    secret_key: string;
    role_arn: string;
    jwt_audience: string;
    role_session_name: string;
    sts_endpoint: string;
    sts_region: string;
  };
  gcs: {
    project_id: string;
    endpoint: string;
    token_uri: string;
    auth: string;
    credentialsJson: string;
    jwt_audience: string;
    sts_audience: string;
    service_account_impersonation_url: string;
  };
  azure: {
    endpoint: string;
    account: string;
    auth: string;
    connection_string: string;
    key: string;
    sas_token: string;
  };
  iceberg: {
    region: string;
    endpoint: string;
    access_key: string;
    secret_key: string;
  };
  jdbc: {
    host: string;
    port: string;
    database: string;
    ssl: boolean;
    username: string;
    password: string;
  };
  flight: {
    host: string;
    port: string;
  };
}

export const emptyCreateDataSourceFormSettings = (): CreateDataSourceFlyoutFormSettings => ({
  s3: {
    region: '',
    endpoint: '',
    auth: '',
    access_key: '',
    secret_key: '',
    role_arn: '',
    jwt_audience: '',
    role_session_name: '',
    sts_endpoint: '',
    sts_region: '',
  },
  gcs: {
    project_id: '',
    endpoint: '',
    token_uri: '',
    auth: '',
    credentialsJson: '',
    jwt_audience: '',
    sts_audience: '',
    service_account_impersonation_url: '',
  },
  azure: {
    endpoint: '',
    account: '',
    auth: '',
    connection_string: '',
    key: '',
    sas_token: '',
  },
  iceberg: { region: '', endpoint: '', access_key: '', secret_key: '' },
  jdbc: { host: '', port: '', database: '', ssl: false, username: '', password: '' },
  flight: { host: '', port: '' },
});

export const patchFormSettings = <T extends DataSourceType>(
  state: CreateDataSourceFlyoutFormSettings,
  type: T,
  patch: Partial<CreateDataSourceFlyoutFormSettings[typeof type]>
): CreateDataSourceFlyoutFormSettings => ({
  ...state,
  [type]: { ...state[type], ...patch } as CreateDataSourceFlyoutFormSettings[typeof type],
});
