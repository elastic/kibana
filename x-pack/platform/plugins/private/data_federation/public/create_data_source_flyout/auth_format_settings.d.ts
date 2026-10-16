/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AzureDataSourceWithSecrets,
  GCSDataSourceWithSecrets,
  S3DataSourceWithSecrets,
} from '../../common/datasource_types';
import type {
  AzureAuthenticationMode,
  GcsAuthenticationMode,
  S3AuthenticationMode,
} from './create_data_source_flyout_authentication';
export declare const authFormatSettingsByDataSourceType: {
  s3: Record<
    S3AuthenticationMode,
    (dataSourceWithSecrets: S3DataSourceWithSecrets) => Record<string, unknown>
  >;
  gcs: Record<
    GcsAuthenticationMode,
    (dataSourceWithSecrets: GCSDataSourceWithSecrets) => Record<string, unknown>
  >;
  azure: Record<
    AzureAuthenticationMode,
    (dataSourceWithSecrets: AzureDataSourceWithSecrets) => Record<string, unknown>
  >;
};
