/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  MappingProperty,
  MappingSemanticTextProperty,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';

/**
 * Reads the `inference_id` currently configured on a `semantic_text` field
 * in an existing index.
 *
 * Returns `undefined` when:
 *  - the index does not exist yet (first boot)
 *  - the field is not mapped as `semantic_text`
 *  - the mapping has no explicit `inference_id` (uses cluster default)
 *
 * This is used to construct storage settings that are compatible with the
 * existing mapping so that `putMapping` does not attempt an incompatible
 * inference endpoint change (e.g. ELSER sparse -> Jina dense).
 */
export async function getInferenceIdFromIndex(
  esClient: ElasticsearchClient,
  indexAlias: string,
  dottedFieldPath: string,
  logger: Logger
): Promise<string | undefined> {
  try {
    const response = await esClient.indices.getMapping({ index: indexAlias });

    const [indexName, indexMappings] = Object.entries(response)[0];
    if (!indexMappings?.mappings?.properties) {
      return undefined;
    }

    const property = resolveNestedProperty(
      indexMappings.mappings.properties,
      dottedFieldPath.split('.')
    );

    if (!property || property.type !== 'semantic_text') {
      return undefined;
    }

    const inferenceId = (property as MappingSemanticTextProperty).inference_id;

    if (!inferenceId) {
      logger.debug(
        `semantic_text field "${dottedFieldPath}" on index ${indexName} has no explicit inference_id`
      );
    }

    return inferenceId;
  } catch (error) {
    logger.debug(
      `Unable to read mapping for index "${indexAlias}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
}

function resolveNestedProperty(
  properties: Record<string, MappingProperty>,
  segments: string[]
): MappingProperty | undefined {
  const [head, ...rest] = segments;
  const prop = properties[head];
  if (!prop) {
    return undefined;
  }
  if (rest.length === 0) {
    return prop;
  }
  if ('properties' in prop && prop.properties) {
    return resolveNestedProperty(prop.properties, rest);
  }
  return undefined;
}
