/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { resourceNames } from '..';

export async function updateKnowledgeBaseIndexMapping({
  esClient,
  logger,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
}) {
  const resolved = await esClient.asInternalUser.indices.simulateTemplate({
    name: resourceNames.indexTemplate.kb,
  });

  const resolvedProperties = resolved.template?.mappings?.properties;

  if (resolvedProperties) {
    await esClient.asInternalUser.indices.putMapping({
      index: resourceNames.writeIndexAlias.kb,
      properties: resolvedProperties,
    });
    logger.info(
      `Updated mappings for index [${resourceNames.writeIndexAlias.kb}] from template [${resourceNames.indexTemplate.kb}].`
    );
  } else {
    logger.warn(
      `No mappings found in index template [${resourceNames.indexTemplate.kb}], skipping mapping update.`
    );
  }
}
