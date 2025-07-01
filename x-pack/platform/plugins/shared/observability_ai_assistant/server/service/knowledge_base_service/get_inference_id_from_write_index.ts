/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { MappingSemanticTextProperty } from '@elastic/elasticsearch/lib/api/types';
import { first } from 'lodash';
import { Logger } from '@kbn/logging';
import { resourceNames } from '..';

export async function getConcreteWriteIndex(
  esClient: { asInternalUser: ElasticsearchClient },
  logger: Logger
) {
  try {
    const res = await esClient.asInternalUser.indices.getAlias({
      name: resourceNames.writeIndexAlias.kb,
    });

    return first(Object.keys(res));
  } catch (error) {
    logger.debug(
      `Unable to get concrete write index for index alias "${resourceNames.writeIndexAlias.kb}": ${error}`
    );
    return;
  }
}

export async function getInferenceIdFromWriteIndex(
  esClient: {
    asInternalUser: ElasticsearchClient;
  },
  logger: Logger
): Promise<string | undefined> {
  try {
    const response = await esClient.asInternalUser.indices.getMapping({
      index: resourceNames.writeIndexAlias.kb,
    });

    const [indexName, indexMappings] = Object.entries(response)[0];

    const inferenceId = (
      indexMappings.mappings?.properties?.semantic_text as MappingSemanticTextProperty
    )?.inference_id;

    if (!inferenceId) {
      logger.debug(`Inference ID missing in field mappings for index ${indexName}.`);
      return undefined;
    }

    return inferenceId;
  } catch (error) {
    logger.debug(
      `Unable to get index mapping for index alias "${resourceNames.writeIndexAlias.kb}": ${error}`
    );
    return undefined;
  }
}
