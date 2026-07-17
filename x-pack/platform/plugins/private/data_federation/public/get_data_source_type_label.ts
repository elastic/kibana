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
export function getDataSourceTypeVerbose(type: DataSourceType): string {
  return messages[type];
}

const messages: Record<DataSourceType, string> = {
  s3: i18n.translate('xpack.dataFederation.dataSourceType.s3Label', {
    defaultMessage: 'Amazon S3',
  }),
  gcs: i18n.translate('xpack.dataFederation.dataSourceType.gcsLabel', {
    defaultMessage: 'Google Cloud Storage',
  }),
  azure: i18n.translate('xpack.dataFederation.dataSourceType.azureLabel', {
    defaultMessage: 'Azure',
  }),
};
