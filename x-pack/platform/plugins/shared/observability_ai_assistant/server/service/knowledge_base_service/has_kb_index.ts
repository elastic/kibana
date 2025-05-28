/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { resourceNames } from '..';

export async function hasKbWriteIndex({
  esClient,
}: {
  esClient: { asInternalUser: ElasticsearchClient };
}) {
  return esClient.asInternalUser.indices.exists({
    index: resourceNames.writeIndexAlias.kb,
  });
}
