/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { dataStreamService } from '../../services';

export async function getDataStreamsCreationDate({
  esClient,
  dataStreams,
}: {
  esClient: ElasticsearchClient;
  dataStreams: string[];
}) {
  const matchingStreamsCreationDate = await Promise.all(
    dataStreams.map(async (name) => {
      const [dataStream] = await dataStreamService.getMatchingDataStreams(esClient, name);
      const oldestIndex = dataStream?.indices[0];
      if (!oldestIndex) {
        return { name, creationDate: undefined };
      }

      const response = await esClient.cat.indices({
        index: oldestIndex.index_name,
        h: ['creation.date'],
        format: 'json',
      });

      const creationDate = response[0]?.['creation.date'];
      return { name, creationDate: creationDate ? Number(creationDate) : undefined };
    })
  );

  return matchingStreamsCreationDate.reduce((acc, { name, creationDate }) => {
    acc[name] = creationDate;
    return acc;
  }, {} as Record<string, number | undefined>);
}
