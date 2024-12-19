/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { appContextService } from '../../..';

import { retryTransientEsErrors } from '../retry';

export async function updateIndexSettings(
  esClient: ElasticsearchClient,
  index: string,
  settings: IndicesIndexSettings
): Promise<void> {
  const logger = appContextService.getLogger();

  if (index) {
    try {
      await retryTransientEsErrors(() =>
        esClient.indices.putSettings({
          index,
          body: settings,
        })
      );
    } catch (err) {
      // No need to throw error and block installation process
      logger.debug(`Could not update index settings for ${index} because ${err}`);
    }
  }
}
