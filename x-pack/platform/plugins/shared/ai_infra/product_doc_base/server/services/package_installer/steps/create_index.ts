/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingTypeMapping, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { internalElserInferenceId } from '../../../../common/consts';

export const createIndex = async ({
  esClient,
  indexName,
  mappings,
  log,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  mappings: MappingTypeMapping;
  log: Logger;
}) => {
  log.debug(`Creating index ${indexName}`);

  overrideInferenceId(mappings, internalElserInferenceId);

  await esClient.indices.create({
    index: indexName,
    mappings,
    settings: {
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
    },
  });
};

const overrideInferenceId = (mappings: MappingTypeMapping, inferenceId: string) => {
  const recursiveOverride = (current: MappingTypeMapping | MappingProperty) => {
    if ('type' in current && current.type === 'semantic_text') {
      current.inference_id = inferenceId;
    }
    if ('properties' in current && current.properties) {
      for (const prop of Object.values(current.properties)) {
        recursiveOverride(prop);
      }
    }
  };
  recursiveOverride(mappings);
};
