/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';

export interface FieldValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_ES_TYPES = new Set([
  'keyword',
  'text',
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'date',
  'date_nanos',
  'boolean',
  'binary',
  'integer_range',
  'float_range',
  'long_range',
  'double_range',
  'date_range',
  'ip_range',
  'object',
  'nested',
  'geo_point',
  'geo_shape',
  'ip',
  'completion',
  'token_count',
  'dense_vector',
  'sparse_vector',
  'rank_feature',
  'rank_features',
  'flattened',
  'shape',
  'histogram',
  'constant_keyword',
  'wildcard',
  'unsigned_long',
  'version',
  'match_only_text',
]);

/**
 * Converts flat dotted-name field mappings into ES mapping `properties` format.
 */
const fieldMappingsToEsProperties = (fields: FieldMappingEntry[]): Record<string, unknown> => {
  const properties: Record<string, unknown> = {};

  for (const field of fields) {
    if (field.type === 'group') continue;

    const parts = field.name.split('.');
    let current = properties;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = { properties: {} };
      }
      current = (current[part] as Record<string, unknown>).properties as Record<string, unknown>;
    }

    const leafName = parts[parts.length - 1];
    current[leafName] = { type: field.type };
  }

  return properties;
};

/**
 * Validates field mappings against Elasticsearch using `indices.simulateIndexTemplate`.
 *
 * Builds a temporary index template with the field mappings converted to ES
 * properties format, then asks ES to simulate resolving it. If ES returns an
 * error (e.g. invalid field type), those errors are captured and returned.
 */
export const validateFieldMappings = async (
  esClient: ElasticsearchClient,
  fields: FieldMappingEntry[],
  logger: Logger
): Promise<FieldValidationResult> => {
  const staticErrors: string[] = [];
  for (const field of fields) {
    if (field.type !== 'group' && !VALID_ES_TYPES.has(field.type)) {
      staticErrors.push(`Field "${field.name}" has unsupported type "${field.type}"`);
    }
  }

  if (staticErrors.length > 0) {
    return { valid: false, errors: staticErrors };
  }

  const customFields = fields.filter((f) => !f.is_ecs);
  if (customFields.length === 0) {
    return { valid: true, errors: [] };
  }

  const properties = fieldMappingsToEsProperties(customFields);
  const templateName = `validate_auto_import_fields_${Date.now()}`;

  try {
    await esClient.indices.simulateIndexTemplate({
      name: templateName,
      body: {
        index_patterns: [`${templateName}-*`],
        template: {
          mappings: { properties },
        },
      },
    });

    return { valid: true, errors: [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    logger.warn(`Field mapping validation failed: ${errorMessage}`);
    return { valid: false, errors: [errorMessage] };
  }
};
