/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { LoggerFactory } from '@kbn/core/server';

import { FILE_STORAGE_INTEGRATION_INDEX_NAMES } from '../../../common/constants';

import { getFileDataIndexName, getFileMetadataIndexName } from '../../../common';

import { FleetFilesClientError } from '../../errors';

import { FleetToHostFilesClient } from './client_to_host';

import { FleetFromHostFilesClient } from './client_from_host';

import type { FilesClientFactory } from './types';

interface GetFilesClientFactoryParams {
  esClient: ElasticsearchClient;
  logger: LoggerFactory;
}

export const getFilesClientFactory = ({
  esClient,
  logger,
}: GetFilesClientFactoryParams): FilesClientFactory => {
  return {
    fromHost: (packageName) => {
      if (!FILE_STORAGE_INTEGRATION_INDEX_NAMES[packageName]?.fromHost) {
        throw new FleetFilesClientError(
          `Integration name [${packageName}] does not have access to files received from host`
        );
      }

      return new FleetFromHostFilesClient(
        esClient,
        logger.get('fleetFiles', packageName),
        getFileMetadataIndexName(packageName),
        getFileDataIndexName(packageName)
      );
    },

    toHost: (packageName, maxFileBytes) => {
      if (!FILE_STORAGE_INTEGRATION_INDEX_NAMES[packageName]?.toHost) {
        throw new FleetFilesClientError(
          `Integration name [${packageName}] does not have access to files for delivery to host`
        );
      }

      return new FleetToHostFilesClient(
        esClient,
        logger.get('fleetFiles', packageName),
        getFileMetadataIndexName(packageName, true),
        getFileDataIndexName(packageName, true),
        maxFileBytes
      );
    },
  };
};
