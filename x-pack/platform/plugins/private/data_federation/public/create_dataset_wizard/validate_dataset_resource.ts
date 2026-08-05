/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource, DataSourceType } from '../../common';
import { datasetWizardStrings } from './dataset_wizard_i18n';

const S3_RESOURCE_SCHEMES = ['s3://', 's3a://', 's3n://'] as const;
const GCS_RESOURCE_SCHEME = 'gs://';
const AZURE_RESOURCE_SCHEME = 'https://';

const hasSchemePrefix = (value: string, scheme: string): boolean =>
  value.toLowerCase().startsWith(scheme.toLowerCase());

const getInvalidResourceMessage = (dataSourceType: DataSourceType): string => {
  switch (dataSourceType) {
    case 's3':
      return datasetWizardStrings.resourceInvalidS3();
    case 'gcs':
      return datasetWizardStrings.resourceInvalidGcs();
    case 'azure':
      return datasetWizardStrings.resourceInvalidAzure();
  }
};

export const validateResourceUriForDataSourceType = (
  resource: string,
  dataSourceType: DataSourceType
): true | string => {
  const trimmed = resource.trim();
  if (!trimmed) {
    return datasetWizardStrings.resourceRequired();
  }

  switch (dataSourceType) {
    case 's3':
      return S3_RESOURCE_SCHEMES.some((scheme) => hasSchemePrefix(trimmed, scheme))
        ? true
        : getInvalidResourceMessage('s3');
    case 'gcs':
      return hasSchemePrefix(trimmed, GCS_RESOURCE_SCHEME)
        ? true
        : getInvalidResourceMessage('gcs');
    case 'azure':
      return hasSchemePrefix(trimmed, AZURE_RESOURCE_SCHEME)
        ? true
        : getInvalidResourceMessage('azure');
  }
};

export const validateResourceForDataSource = (
  resource: string,
  dataSourceName: string,
  dataSources: readonly DataSource[]
): true | string => {
  const trimmedResource = resource?.trim() ?? '';
  if (!trimmedResource) {
    return datasetWizardStrings.resourceRequired();
  }

  const trimmedDataSourceName = dataSourceName?.trim() ?? '';
  if (!trimmedDataSourceName) {
    return true;
  }

  const dataSource = dataSources.find((entry) => entry.name === trimmedDataSourceName);
  if (!dataSource) {
    return true;
  }

  return validateResourceUriForDataSourceType(trimmedResource, dataSource.type);
};
