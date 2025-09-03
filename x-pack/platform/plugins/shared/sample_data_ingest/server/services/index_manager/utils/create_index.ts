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
  isServerless = false,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  legacySemanticText: boolean;
  mappings: MappingTypeMapping;
  log: Logger;
  elserInferenceId?: string;
  isServerless?: boolean;
}) => {
  log.debug(`Creating index ${indexName}`);

  overrideInferenceId(mappings, elserInferenceId);

  await esClient.indices.create({
    index: indexName,
    mappings,
    settings: !isServerless
      ? {
          auto_expand_replicas: '0-1',
          'index.mapping.semantic_text.use_legacy_format': legacySemanticText,
        }
      : undefined,
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
