/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fields accepted when creating or updating a data source (Elasticsearch
 * `PUT /_query/datasource/{id}` and the internal Kibana proxy route).
 */

export interface DataSourceCommon<T extends DataSourceType, S extends {}> {
  type: T;
  description: string;
  name: string;
  settings: S;
}

export type DataSource = S3DataSource | GCSDataSource | AzureDataSource;

// When read back from ES, the secret fields below come redacted (value
// ES_REDACTED_SECRET_VALUE) rather than in plain text, so routes can return them to the
// caller as-is.
export type DataSourceWithSecrets =
  | S3DataSourceWithSecrets
  | GCSDataSourceWithSecrets
  | AzureDataSourceWithSecrets;

/** Sentinel value Elasticsearch substitutes for a secret field on GET. */
export const ES_REDACTED_SECRET_VALUE = '::es_redacted::';

export type DataSourceType = 's3' | 'gcs' | 'azure';

/**
 * The settings fields Elasticsearch stores as encrypted secrets, per data source type.
 * On PUT these fields get merge semantics: omitting one keeps the stored value, an
 * explicit `null` clears it, a supplied value replaces it. Every other settings field is
 * plaintext and keeps full-replace semantics on PUT.
 */
export const SECRET_FIELDS_BY_TYPE: Record<DataSourceType, readonly string[]> = {
  s3: ['access_key', 'secret_key'],
  gcs: ['credentials'],
  azure: ['connection_string', 'key', 'sas_token'],
};

/**
 * Of `SECRET_FIELDS_BY_TYPE`, the subset the create/edit flyout actually exposes for each
 * type. Azure's `connection_string` and `sas_token` are valid ES secret fields but the
 * flyout only supports `key`-based auth, so those two never appear in submitted settings
 * regardless of whether the stored data source has them set. On update, only fields in
 * this list should be nulled when absent — the rest must be left untouched so editing an
 * Azure source created outside the UI (e.g. via the API) can't wipe an auth method the UI
 * doesn't manage.
 */
export const UI_MANAGED_SECRET_FIELDS_BY_TYPE: Record<DataSourceType, readonly string[]> = {
  ...SECRET_FIELDS_BY_TYPE,
  azure: ['key'],
};

/** All supported data source type values, for select components and validation. */
export const ALL_DATA_SOURCE_TYPES: DataSourceType[] = ['s3', 'gcs', 'azure'];

/**
 * UI icon types for data source types (EUI icon names).
 * Consumers should treat this as optional per type.
 */

export const DATA_SOURCE_TYPES_TO_ICONS: Record<DataSourceType, string> = {
  s3: 'logoAWS',
  gcs: 'logoGCP',
  azure: 'logoAzure',
} as const;

export const DATA_SOURCE_TYPES_TO_HELP_TEXT: Partial<Record<DataSourceType, string>> = {
  // TODO
  // URI, glob pattern, table name, or SQL query that identifies the data (e.g. s3://logs-bucket/access/**/*.parquet).
  s3: 'URI with path and glob pattern(e.g. s3://logs-bucket/access/**/*.parquet)',
  gcs: 'URI with path and glob pattern(e.g. s3://logs-bucket/access/**/*.parquet)',
  azure: 'URI with path and glob pattern(e.g. s3://logs-bucket/access/**/*.parquet)',
} as const;

export type S3DataSource = DataSourceCommon<'s3', S3DataSourceSettings>;

export type S3DataSourceWithSecrets = DataSourceCommon<'s3', S3DataSourceSettingsWithSecrets>;

export interface S3DataSourceSettings {
  region?: string;
  endpoint?: string;
  auth?: string;
}

export interface S3DataSourceSettingsWithSecrets extends S3DataSourceSettings {
  access_key?: string;
  secret_key?: string;
  role_arn?: string;
  jwt_audience?: string;
  role_session_name?: string;
  sts_endpoint?: string;
  sts_region?: string;
}

export type GCSDataSource = DataSourceCommon<'gcs', GCSDataSourceSettings>;

export type GCSDataSourceWithSecrets = DataSourceCommon<'gcs', GCSDataSourceSettingsWithSecrets>;

export interface GCSDataSourceSettings {
  project_id?: string;
  endpoint?: string;
  token_uri?: string;
  auth?: string;
}

export interface GCSDataSourceSettingsWithSecrets extends GCSDataSourceSettings {
  credentials?: string;
  jwt_audience?: string;
  sts_audience?: string;
  service_account_impersonation_url?: string;
}

export type AzureDataSource = DataSourceCommon<'azure', AzureDataSourceSettings>;

export type AzureDataSourceWithSecrets = DataSourceCommon<
  'azure',
  AzureDataSourceSettingsWithSecrets
>;

export interface AzureDataSourceSettings {
  endpoint?: string;
  account?: string;
  auth?: string;
}

export interface AzureDataSourceSettingsWithSecrets extends AzureDataSourceSettings {
  connection_string?: string;
  key?: string;
  sas_token?: string;
  tenant_id?: string;
  client_id?: string;
  jwt_audience?: string;
}
