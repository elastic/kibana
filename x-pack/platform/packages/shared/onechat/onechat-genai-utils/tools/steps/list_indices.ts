/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export interface ListIndexInfo {
  index: string;
  status: string;
  health: string;
  uuid: string;
  docsCount: number;
  primaries: number;
  replicas: number;
}

export const listIndices = async ({
  pattern = '*',
  esClient,
}: {
  pattern?: string;
  esClient: ElasticsearchClient;
}): Promise<ListIndexInfo[]> => {
  const response = await esClient.cat.indices({
    index: pattern,
    format: 'json',
  });

  return response.map(({ index, status, health, uuid, 'docs.count': docsCount, pri, rep }) => ({
    index: index ?? 'unknown',
    status: status ?? 'unknown',
    health: health ?? 'unknown',
    uuid: uuid ?? 'unknown',
    docsCount: parseInt(docsCount ?? '0', 10),
    primaries: parseInt(pri ?? '1', 10),
    replicas: parseInt(rep ?? '0', 10),
  }));
};
