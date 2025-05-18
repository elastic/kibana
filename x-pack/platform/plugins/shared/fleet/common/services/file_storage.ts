/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FILE_STORAGE_DATA_INDEX_PATTERN,
  FILE_STORAGE_METADATA_INDEX_PATTERN,
  FILE_STORAGE_TO_HOST_DATA_INDEX_PATTERN,
  FILE_STORAGE_TO_HOST_METADATA_INDEX_PATTERN,
} from '../constants';

/**
 * Returns the index name for File Metadata storage for a given integration
 * @param integrationName
 * @param forHostDelivery
 */
export const getFileMetadataIndexName = (
  integrationName: string,
  /** if set to true, then the index returned will be for files that are being sent to the host */
  forHostDelivery: boolean = false
): string => {
  const metaIndex = forHostDelivery
    ? FILE_STORAGE_TO_HOST_METADATA_INDEX_PATTERN
    : FILE_STORAGE_METADATA_INDEX_PATTERN;

  if (metaIndex.indexOf('*') !== -1) {
    return metaIndex.replace('*', integrationName);
  }

  throw new Error(
    `Unable to define integration file data index. No '*' in index pattern: ${metaIndex}`
  );
};
/**
 * Returns the index name for File data (chunks) storage for a given integration
 * @param integrationName
 */
export const getFileDataIndexName = (
  integrationName: string,
  /** if set to true, then the index returned will be for files that are being sent to the host */
  forHostDelivery: boolean = false
): string => {
  const dataIndex = forHostDelivery
    ? FILE_STORAGE_TO_HOST_DATA_INDEX_PATTERN
    : FILE_STORAGE_DATA_INDEX_PATTERN;

  if (dataIndex.indexOf('*') !== -1) {
    return dataIndex.replace('*', integrationName);
  }

  throw new Error(
    `Unable to define integration file data index. No '*' in index pattern: ${dataIndex}`
  );
};
