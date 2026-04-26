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

export interface DataSourceCommon {
  type: DataSourceType;
  description: string;
  id: string;
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

export interface S3DataSource extends DataSourceCommon {
  type: 's3';
  settings: S3DataSourceSettings;
}

export interface S3DataSourceWithSecrets extends S3DataSource {
  settings: S3DataSourceSettingsWithSecrets;
}

export interface S3DataSourceSettings {
  region?: string;
  endpoint?: string;
  auth?: string;
}

export interface S3DataSourceSettingsWithSecrets extends S3DataSourceSettings {
  access_key?: string;
  secret_key?: string;
}

export interface GCSDataSource extends DataSourceCommon {
  type: 'gcs';
  settings: GCSDataSourceSettings;
}

export interface GCSDataSourceWithSecrets extends GCSDataSource {
  settings: GCSDataSourceSettingsWithSecrets;
}

export interface GCSDataSourceSettings {
  project_id?: string;
  endpoint?: string;
  token_uri?: string;
  auth?: string;
}

export interface GCSDataSourceSettingsWithSecrets extends GCSDataSourceSettings {
  credentials?: {};
}

export interface AzureBlobDataSource extends DataSourceCommon {
  type: 'azure_blob';
  settings: AzureBlobDataSourceSettings;
}

export interface AzureBlobDataSourceWithSecrets extends AzureBlobDataSource {
  settings: AzureBlobDataSourceSettingsWithSecrets;
}

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

export interface IcebergDataSource extends DataSourceCommon {
  type: 'iceberg';
  settings: IcebergDataSourceSettings;
}

export interface IcebergDataSourceWithSecrets extends IcebergDataSource {
  settings: IcebergDataSourceSettingsWithSecrets;
}

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

export interface JdbcDataSource extends DataSourceCommon {
  type: 'jdbc';
  settings: JdbcDataSourceSettings;
}

export interface JdbcDataSourceWithSecrets extends JdbcDataSource {
  settings: JdbcDataSourceSettingsWithSecrets;
}

export interface JdbcDataSourceSettings extends DataSourceCommon {
  host: string;
  port: string;
  database: string;
  ssl?: boolean;
}

export interface JdbcDataSourceSettingsWithSecrets extends JdbcDataSourceSettings {
  username?: string;
  password?: string;
}

export interface FlightDataSource extends DataSourceCommon {
  type: 'flight';
  settings: {
    host: string;
    port?: number;
  };
}
