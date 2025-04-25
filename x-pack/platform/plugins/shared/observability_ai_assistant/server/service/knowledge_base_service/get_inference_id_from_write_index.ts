/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { MappingSemanticTextProperty } from '@elastic/elasticsearch/lib/api/types';
import { resourceNames } from '..';

export async function getInferenceIdFromWriteIndex(esClient: {
  asInternalUser: ElasticsearchClient;
}): Promise<string> {
  const response = await esClient.asInternalUser.indices.getFieldMapping({
    index: resourceNames.writeIndexAlias.kb,
    fields: 'semantic_text',
  });

  const [indexName, indexMappings] = Object.entries(response)[0];

  const inferenceId = (
    indexMappings.mappings.semantic_text?.mapping.semantic_text as MappingSemanticTextProperty
  )?.inference_id;

  if (!inferenceId) {
    throw new Error(`inference_id not found in field mappings for index ${indexName}`);
  }

  return inferenceId;
}
