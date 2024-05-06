/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamDetails } from '../../../../common/api_types';
import { dataStreamService } from '../../../services';

export async function getDataStreamDetails(args: {
  esClient: ElasticsearchClient;
  dataStream: string;
}): Promise<DataStreamDetails> {
  const { esClient, dataStream } = args;

  if (!dataStream?.trim()) {
    throw badRequest(`Data Stream name cannot be empty. Received value "${dataStream}"`);
  }

  const indexSettings = await dataStreamService.getDataSteamIndexSettings(esClient, dataStream);

  const indexesList = Object.values(indexSettings);

  const indexCreationDate = indexesList
    .map((index) => Number(index.settings?.index?.creation_date))
    .sort((a, b) => a - b)[0];

  return {
    createdOn: indexCreationDate,
  };
}
