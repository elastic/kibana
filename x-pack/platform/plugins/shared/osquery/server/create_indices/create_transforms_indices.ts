/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  MappingTypeMapping,
  IndicesPutMappingRequest,
} from '@elastic/elasticsearch/lib/api/types';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { actionsMapping } from './actions_mapping';
import { actionResponsesMapping } from './action_responses_mapping';

interface ESMappingObject {
  [key: string]: ESMappingValue;
}

type ESMappingValue = string | number | boolean | null | ESMappingObject | undefined;

export const ACTIONS_INDEX_NAME = 'osquery_manager.actions';
export const ACTIONS_INDEX_DEFAULT_NS = '.logs-' + ACTIONS_INDEX_NAME + '-default';

export const ACTION_RESPONSES_INDEX_NAME = 'osquery_manager.action.responses';
export const ACTION_RESPONSES_INDEX_DEFAULT_NS =
  '.logs-' + ACTION_RESPONSES_INDEX_NAME + '-default';

let actionsIndexSetup: Promise<void> | undefined;

/** The `origin` fields every document with an origin writes, and the type each must have. */
const ORIGIN_FIELD_TYPES = {
  'origin.type': 'keyword',
  'origin.run_id': 'keyword',
  'origin.verified': 'boolean',
} as const;

const checkActionsOriginMappings = async (esClient: ElasticsearchClient): Promise<string[]> => {
  const fields = Object.keys(ORIGIN_FIELD_TYPES) as Array<keyof typeof ORIGIN_FIELD_TYPES>;
  const mappings = await esClient.indices.getFieldMapping({
    index: ACTIONS_INDEX_DEFAULT_NS,
    fields,
  });
  const indices = Object.values(mappings);

  return fields.filter((field) => {
    const leaf = field.slice('origin.'.length);
    const expectedType = ORIGIN_FIELD_TYPES[field];
    let missing = indices.length === 0;
    for (const { mappings: fieldMappings } of indices) {
      const property = fieldMappings[field]?.mapping[leaf];
      if (!property) {
        missing = true;
      } else if (!('type' in property) || property.type !== expectedType) {
        throw new Error(`Expected ${field} to be mapped as ${expectedType}`);
      }
    }

    return missing;
  });
};

const setUpActionsIndex = async (esClient: ElasticsearchClient, logger: Logger): Promise<void> => {
  await createIndexIfNotExists(
    esClient,
    ACTIONS_INDEX_NAME,
    ACTIONS_INDEX_DEFAULT_NS,
    actionsMapping,
    logger
  );

  if ((await checkActionsOriginMappings(esClient)).length === 0) {
    return;
  }

  const origin = actionsMapping.properties?.origin;
  if (!origin) {
    throw new Error('The actions mapping has no origin definition');
  }

  await esClient.indices.putMapping({
    index: ACTIONS_INDEX_DEFAULT_NS,
    properties: { origin },
  });
  const missingFields = await checkActionsOriginMappings(esClient);
  if (missingFields.length > 0) {
    throw new Error(`Missing origin mappings for ${missingFields.join(', ')}`);
  }
};

/** Confirms live origin keyword mappings, sharing attempts and caching only success per process. */
export const ensureActionsIndexMappings = (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  actionsIndexSetup ??= setUpActionsIndex(esClient, logger).catch((error) => {
    actionsIndexSetup = undefined;
    throw error;
  });

  return actionsIndexSetup;
};

export const initializeTransformsIndices = async (esClient: ElasticsearchClient, logger: Logger) =>
  Promise.all([
    createIndexIfNotExists(
      esClient,
      ACTIONS_INDEX_NAME,
      ACTIONS_INDEX_DEFAULT_NS,
      actionsMapping,
      logger
    ),
    createIndexIfNotExists(
      esClient,
      ACTION_RESPONSES_INDEX_NAME,
      ACTION_RESPONSES_INDEX_DEFAULT_NS,
      actionResponsesMapping,
      logger
    ),
  ]);

export const createIndexIfNotExists = async (
  esClient: ElasticsearchClient,
  indexTemplateName: string,
  indexPattern: string,
  mappings: MappingTypeMapping,
  logger: Logger
) => {
  const subLogger = logger.get('createIndexIfNotExists');
  try {
    const isLatestIndexExists = await esClient.indices.exists({
      index: indexPattern,
    });

    if (!isLatestIndexExists) {
      subLogger.debug(`Index ${indexTemplateName} does not exist, creating...`);

      await esClient.indices.putIndexTemplate({
        name: indexTemplateName,
        index_patterns: indexPattern,
        template: { mappings },
        priority: 500,
      });

      await esClient.indices.create({
        index: indexPattern,
        mappings,
      });
    } else {
      subLogger.debug(`Index ${indexTemplateName} already exists, checking template...`);

      // pull the index template to check if mappings need to be updated
      const indexTemplate = await esClient.indices.getIndexTemplate({
        name: indexTemplateName,
      });

      // Find the template with the exact name match
      const matchedTemplateObj = indexTemplate.index_templates.find(
        (tpl: { name: string }) => tpl.name === indexTemplateName
      );
      const currentMappings = matchedTemplateObj?.index_template?.template?.mappings || {};

      subLogger.debug(`Fetched current mappings for template "${indexTemplateName}"`);

      if (isSubsetMapping(mappings, currentMappings as ESMappingObject, subLogger)) {
        subLogger.debug(`Mappings for "${indexTemplateName}" are up to date. No update needed.`);

        return;
      }

      subLogger.debug(`Mappings for "${indexTemplateName}" are outdated. Updating mappings...`);

      if (mappings.properties) {
        await esClient.indices.putIndexTemplate({
          name: indexTemplateName,
          index_patterns: indexPattern,
          template: { mappings },
          priority: 500,
        });

        await esClient.indices.putMapping({
          index: indexPattern,
          body: (mappings.properties
            ? { properties: mappings.properties }
            : {}) as IndicesPutMappingRequest['body'],
        });

        subLogger.debug(`Mappings for "${indexTemplateName}" have been updated.`);
      } else {
        subLogger.error(`No properties found in mappings for "${indexTemplateName}"`);
      }
    }
  } catch (err) {
    const error = transformError(err);
    subLogger.error(`Failed to create the index template: ${indexTemplateName}`);
    subLogger.error(error.message);
  }
};

/**
 * Recursively checks if all fields and configs from `desired` mapping exist in `current` mapping.
 * Ignores extra fields in `current`. Logs each major step for traceability.
 *
 * @param desired - The mapping you want to enforce
 * @param current - The mapping fetched from ESccc
 * @param logger - Kibana logger instance
 * @returns true if all fields/configs in desired are present in current
 */
export function isSubsetMapping(
  desired: MappingTypeMapping | ESMappingObject,
  current: MappingTypeMapping | ESMappingObject,
  logger: Logger
): boolean {
  const subLogger = logger.get('isSubsetMapping');

  // Handle primitive types or null values
  if (typeof desired !== 'object' || desired === null) {
    const result = desired === current;
    subLogger.debug(`Comparing leaf values: ${desired} === ${current} -> ${result}`);

    return result;
  }

  // Convert both to ESMappingObject to safely access with string keys
  const desiredObj = desired as ESMappingObject;
  const currentObj = current as ESMappingObject;

  for (const key of Object.keys(desiredObj)) {
    if (!(key in currentObj)) {
      subLogger.debug(`Key "${key}" missing in current mapping`);

      return false;
    }

    const desiredValue = desiredObj[key];
    const currentValue = currentObj[key];

    const bothAreNonNullObjects =
      typeof desiredValue === 'object' &&
      desiredValue !== null &&
      typeof currentValue === 'object' &&
      currentValue !== null;

    if (key === 'properties') {
      if (bothAreNonNullObjects) {
        if (
          !isSubsetMapping(desiredValue as ESMappingObject, currentValue as ESMappingObject, logger)
        ) {
          subLogger.debug(`Nested properties mismatch for key "${key}"`);

          return false;
        }
      } else {
        subLogger.debug(`Expected both desired and current to be objects for key "${key}"`);

        return false;
      }
    } else if (bothAreNonNullObjects) {
      if (
        !isSubsetMapping(desiredValue as ESMappingObject, currentValue as ESMappingObject, logger)
      ) {
        subLogger.debug(`Value mismatch for key "${key}"`);

        return false;
      }
    } else if (desiredValue !== currentValue) {
      subLogger.debug(`Value mismatch for key "${key}": ${desiredValue} !== ${currentValue}`);

      return false;
    }
  }

  return true;
}
