/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFileDataIndexName, getFileMetadataIndexName } from '../../../common/services';

import {
  FILE_STORAGE_DATA_INDEX_PATTERN,
  FILE_STORAGE_METADATA_INDEX_PATTERN,
  FILE_STORAGE_TO_HOST_DATA_INDEX_PATTERN,
  FILE_STORAGE_TO_HOST_METADATA_INDEX_PATTERN,
} from '../../../common/constants';

import { FleetError } from '../../errors';
interface ParsedFileStorageIndex {
  index: string;
  integration: string;
  type: 'meta' | 'data';
  direction: 'to-host' | 'from-host';
}

/**
 * Given a document index (from either a file's metadata doc or a file's chunk doc), utility will
 * parse it and return information about that index
 * @param index
 */
export const parseFileStorageIndex = (index: string): ParsedFileStorageIndex => {
  const response: ParsedFileStorageIndex = {
    index: '',
    integration: '',
    type: 'meta',
    direction: 'from-host',
  };

  const fileStorageIndexPatterns = [
    FILE_STORAGE_METADATA_INDEX_PATTERN,
    FILE_STORAGE_DATA_INDEX_PATTERN,

    FILE_STORAGE_TO_HOST_METADATA_INDEX_PATTERN,
    FILE_STORAGE_TO_HOST_DATA_INDEX_PATTERN,
  ];

  for (const indexPattern of fileStorageIndexPatterns) {
    const indexPrefix = indexPattern.substring(0, indexPattern.indexOf('*'));

    if (index.includes(indexPrefix)) {
      const isDeliveryToHost = index.includes('-tohost-');
      const isDataIndex = index.includes('host-data-');
      const integrationPosition = indexPattern.split('-').indexOf('*');
      const integration = index
        .replace(/^\.ds-/, '')
        .split('-')
        .at(integrationPosition);

      if (!integration) {
        throw new FleetError(`Index name ${index} does not seem to be a File storage index`);
      }

      response.direction = isDeliveryToHost ? 'to-host' : 'from-host';
      response.type = isDataIndex ? 'data' : 'meta';
      response.integration = integration;
      response.index = isDataIndex
        ? getFileDataIndexName(response.integration, isDeliveryToHost)
        : getFileMetadataIndexName(response.integration, isDeliveryToHost);

      return response;
    }
  }

  throw new FleetError(
    `Unable to parse index [${index}]. Does not match a known index pattern: [${fileStorageIndexPatterns.join(
      ' | '
    )}]`
  );
};
