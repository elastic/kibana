/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { datasetQualityPrivileges, dataStreamService } from '../../../services';
import { DataStreamSettings } from '../../../../common/api_types';
import { getDataStreamCreatedOn } from './get_datastream_created_on';

export async function getDataStreamSettings({
  esClient,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
}): Promise<DataStreamSettings> {
  const [createdOn, [dataStreamInfo], datasetUserPrivileges] = await Promise.all([
    getDataStreamCreatedOn(esClient, dataStream),
    dataStreamService.getMatchingDataStreams(esClient, dataStream),
    datasetQualityPrivileges.getDatasetPrivileges(esClient, dataStream),
  ]);

  const integration = dataStreamInfo?._meta?.package?.name;
  const lastBackingIndex = dataStreamInfo?.indices?.at(-1);
  const indexTemplate = dataStreamInfo?.template;

  return {
    createdOn,
    integration,
    datasetUserPrivileges,
    lastBackingIndexName: lastBackingIndex?.index_name,
    indexTemplate,
  };
}
