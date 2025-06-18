/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingTypeMapping, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { internalElserInferenceId } from '../../../../common';

export const createIndex = async ({
  esClient,
  indexName,
  mappings,
  legacySemanticText,
  log,
  elserInferenceId = internalElserInferenceId,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  legacySemanticText: boolean;
  mappings: MappingTypeMapping;
  log: Logger;
  elserInferenceId?: string;
}) => {
  log.debug(`Creating index ${indexName}`);
  log.info('creating index');

  overrideInferenceId(mappings, elserInferenceId);

  log.info('creating 2');

  await esClient.indices.create({
    index: indexName,
    mappings,
    settings: {
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
      'index.mapping.semantic_text.use_legacy_format': legacySemanticText,
    },
  });

  log.info('creatin 3');
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
