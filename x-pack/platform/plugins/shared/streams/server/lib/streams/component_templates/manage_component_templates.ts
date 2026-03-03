/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { getErrorMessage } from '../errors/parse_error';
import { retryTransientEsErrors } from '../helpers/retry';

interface DeleteComponentOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

interface ComponentManagementOptions {
  esClient: ElasticsearchClient;
  component: ClusterPutComponentTemplateRequest;
  logger: Logger;
}

export async function deleteComponent({ esClient, name, logger }: DeleteComponentOptions) {
  try {
    await retryTransientEsErrors(
      () => esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] }),
      { logger }
    );
  } catch (error) {
    logger.error(`Error deleting component template: ${getErrorMessage(error)}`);
    throw error;
  }
}

export async function upsertComponent({ esClient, component, logger }: ComponentManagementOptions) {
  try {
    await retryTransientEsErrors(() => esClient.cluster.putComponentTemplate(component), {
      logger,
    });
    logger.debug(() => `Installed component template: ${JSON.stringify(component)}`);
  } catch (error) {
    logger.error(`Error updating component template: ${getErrorMessage(error)}`);
    throw error;
  }
}
