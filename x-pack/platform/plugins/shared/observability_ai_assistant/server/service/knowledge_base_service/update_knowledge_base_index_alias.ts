/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { resourceNames } from '..';

export async function updateKnowledgeBaseWriteIndexAlias({
  esClient,
  logger,
  index,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
  logger: Logger;
  index: string;
}) {
  logger.debug(`Updating write index alias to "${index}"`);
  await esClient.asInternalUser.indices.updateAliases({
    actions: [
      {
        add: {
          index,
          alias: resourceNames.writeIndexAlias.kb,
          is_write_index: true,
        },
      },
    ],
  });
}
