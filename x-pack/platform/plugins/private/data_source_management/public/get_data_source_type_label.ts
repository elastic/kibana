/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { DataSourceType } from '../common/datasource_types';

/**
 * User-visible label for a data source type (flyout, tables).
 */
export function getDataSourceTypeLabel(type: DataSourceType): string {
  return i18n.translate(`dataSourceManagement.dataSourceType.${type}`, {
    defaultMessage: messages[type],
  });
}

const messages: Record<DataSourceType, string> = {
  s3: 'Amazon S3',
  gcs: 'Google Cloud Storage',
  azure_blob: 'Azure Blob Storage',
  iceberg: 'Apache Iceberg',
  jdbc: 'JDBC',
  flight: 'Apache Arrow Flight',
};
