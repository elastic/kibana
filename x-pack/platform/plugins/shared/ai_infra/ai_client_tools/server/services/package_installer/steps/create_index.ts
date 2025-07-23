/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingTypeMapping, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isLegacySemanticTextVersion } from '../utils';

export const createIndex = async ({
  esClient,
  indexName,
  manifestVersion,
  mappings,
  log,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  manifestVersion: string;
  mappings: MappingTypeMapping;
  log: Logger;
}) => {
  log.debug(`Creating index ${indexName}`);

  const legacySemanticText = isLegacySemanticTextVersion(manifestVersion);

  await esClient.indices.create({
    index: indexName,
    mappings,
    settings: {
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
      'index.mapping.semantic_text.use_legacy_format': legacySemanticText,
    },
  });
};

export const overrideInferenceSettings = (
  mappings: MappingTypeMapping,
  inferenceId: string,
  modelSettingsToOverride?: object
) => {
  const recursiveOverride = (current: MappingTypeMapping | MappingProperty) => {
    if (isPopulatedObject(current, ['type']) && current.type === 'semantic_text') {
      current.inference_id = inferenceId;
      if (modelSettingsToOverride) {
        // @ts-expect-error - model_settings is not typed, but exists for semantic_text field
        current.model_settings = modelSettingsToOverride;
      }
    }
    if (isPopulatedObject(current, ['properties'])) {
      for (const prop of Object.values(
        current.properties as Record<string, MappingTypeMapping | MappingProperty>
      )) {
        recursiveOverride(prop);
      }
    }
  };
  recursiveOverride(mappings);
};
