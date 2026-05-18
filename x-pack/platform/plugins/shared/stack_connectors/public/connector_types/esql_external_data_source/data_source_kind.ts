/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Mirrors {@link DataSourceType} in data_source_management (cannot import private plugin).
 * Keep lists and labels aligned with Stack Management → External data sources.
 */
export type EsqlExternalDataSourceKind =
  | 's3'
  | 'gcs'
  | 'azure_blob'
  | 'iceberg'
  | 'jdbc'
  | 'flight';

export const ALL_ESQL_EXTERNAL_DATA_SOURCE_KINDS: readonly EsqlExternalDataSourceKind[] = [
  's3',
  'gcs',
  'azure_blob',
  'iceberg',
  'jdbc',
  'flight',
];

const defaultKindLabels: Record<EsqlExternalDataSourceKind, string> = {
  s3: 'Amazon S3',
  gcs: 'Google Cloud Storage',
  azure_blob: 'Azure Blob Storage',
  iceberg: 'Apache Iceberg',
  jdbc: 'JDBC',
  flight: 'Apache Arrow Flight',
};

export function getEsqlExternalDataSourceKindLabel(kind: EsqlExternalDataSourceKind): string {
  return i18n.translate(`xpack.stackConnectors.esqlExternalDataSource.dataSourceKind.${kind}`, {
    defaultMessage: defaultKindLabels[kind],
  });
}

export function isEsqlExternalDataSourceKind(v: string): v is EsqlExternalDataSourceKind {
  return (ALL_ESQL_EXTERNAL_DATA_SOURCE_KINDS as readonly string[]).includes(v);
}
