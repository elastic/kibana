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
  id: string;
  settings: S;
}

export type DataSource =
  | S3DataSource
  | GCSDataSource
  | AzureBlobDataSource
  | IcebergDataSource
  | JdbcDataSource
  | FlightDataSource;

export type DataSourceWithSecrets =
  | S3DataSourceWithSecrets
  | GCSDataSourceWithSecrets
  | AzureBlobDataSourceWithSecrets
  | IcebergDataSourceWithSecrets
  | JdbcDataSourceWithSecrets
  | FlightDataSource;

export type DataSourceType = 's3' | 'gcs' | 'azure_blob' | 'iceberg' | 'jdbc' | 'flight';

/** All supported data source type values, for select components and validation. */
export const ALL_DATA_SOURCE_TYPES: DataSourceType[] = [
  's3',
  'gcs',
  'azure_blob',
  'iceberg',
  'jdbc',
  'flight',
];

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
  credentials?: {};
}

export type AzureBlobDataSource = DataSourceCommon<'azure_blob', AzureBlobDataSourceSettings>;

export type AzureBlobDataSourceWithSecrets = DataSourceCommon<
  'azure_blob',
  AzureBlobDataSourceSettingsWithSecrets
>;

export interface AzureBlobDataSourceSettings {
  endpoint?: string;
  account?: string;
  auth?: string;
}

export interface AzureBlobDataSourceSettingsWithSecrets extends AzureBlobDataSourceSettings {
  connection_string?: string;
  key?: string;
  sas_token?: string;
}

export type IcebergDataSource = DataSourceCommon<'iceberg', IcebergDataSourceSettings>;

export type IcebergDataSourceWithSecrets = DataSourceCommon<
  'iceberg',
  IcebergDataSourceSettingsWithSecrets
>;

export interface IcebergDataSourceSettings {
  region?: string;
  endpoint?: string;
  access_key?: string;
  secret_key?: string;
}

export interface IcebergDataSourceSettingsWithSecrets extends IcebergDataSourceSettings {
  access_key?: string;
  secret_key?: string;
}

export type JdbcDataSource = DataSourceCommon<'jdbc', JdbcDataSourceSettings>;

export type JdbcDataSourceWithSecrets = DataSourceCommon<'jdbc', JdbcDataSourceSettingsWithSecrets>;

export interface JdbcDataSourceSettings {
  host: string;
  port: string;
  database: string;
  ssl?: boolean;
}

export interface JdbcDataSourceSettingsWithSecrets extends JdbcDataSourceSettings {
  username?: string;
  password?: string;
}

export type FlightDataSource = DataSourceCommon<'flight', FlightDataSourceSettings>;

export interface FlightDataSourceSettings {
  host: string;
  port?: number;
}
