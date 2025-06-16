/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { getInferencePipelineNameFromIndexName } from '../../utils/ml_inference_pipeline_utils';

export const deleteIndexPipelines = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<{ deleted: string[] }> => {
  const deleted: string[] = [];
  const promises = [
    client.asCurrentUser.ingest
      .deletePipeline({ id: indexName })
      .then(() => deleted.push(indexName)),
    client.asCurrentUser.ingest
      .deletePipeline({
        id: getInferencePipelineNameFromIndexName(indexName),
      })
      .then(() => deleted.push(getInferencePipelineNameFromIndexName(indexName))),
    client.asCurrentUser.ingest
      .deletePipeline({ id: `${indexName}@custom` })
      .then(() => deleted.push(`${indexName}@custom`)),
  ];
  await Promise.allSettled(promises);
  return {
    deleted,
  };
};
