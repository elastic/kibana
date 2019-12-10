/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Request } from 'hapi';
import { get } from 'lodash';

import { CallClusterWithRequest } from 'src/legacy/core_plugins/elasticsearch';
import { MappingProperties } from './reindexing/types';

/**
 * Adds the index.query.default_field setting, generated from the index's mapping.
 *
 * @param callWithRequest
 * @param request
 * @param indexName
 * @param fieldTypes - Elasticsearch field types that should be used to generate the default_field from the index mapping
 * @param otherFields - Other fields that should be included in the generated default_field that do not match `fieldTypes`
 */
export const addDefaultField = async (
  callWithRequest: CallClusterWithRequest,
  request: Request,
  indexName: string,
  fieldTypes: ReadonlySet<string>,
  otherFields: ReadonlySet<string> = new Set()
) => {
  // Verify index.query.default_field is not already set.
  const settings = await callWithRequest(request, 'indices.getSettings', {
    index: indexName,
  });
  if (get(settings, `${indexName}.settings.index.query.default_field`)) {
    throw Boom.badRequest(`Index ${indexName} already has index.query.default_field set`);
  }

  // Get the mapping and generate the default_field based on `fieldTypes`
  const mappingResp = await callWithRequest(request, 'indices.getMapping', {
    index: indexName,
  });
  const mapping = mappingResp[indexName].mappings.properties as MappingProperties;
  const generatedDefaultFields = new Set(generateDefaultFields(mapping, fieldTypes));

  // Update the setting with the generated default_field
  return callWithRequest(request, 'indices.putSettings', {
    index: indexName,
    body: {
      index: { query: { default_field: [...generatedDefaultFields, ...otherFields] } },
    },
  });
};

/**
 * Recursively walks an index mapping and returns a flat array of dot-delimited
 * strings represent all fields that are of a type included in `DEFAULT_FIELD_TYPES`
 * @param mapping
 */
export const generateDefaultFields = (
  mapping: MappingProperties,
  fieldTypes: ReadonlySet<string>
): string[] =>
  Object.getOwnPropertyNames(mapping).reduce((defaultFields, fieldName) => {
    const { type, properties } = mapping[fieldName];

    if (type && fieldTypes.has(type)) {
      defaultFields.push(fieldName);
    } else if (properties) {
      generateDefaultFields(properties, fieldTypes).forEach(subField =>
        defaultFields.push(`${fieldName}.${subField}`)
      );
    }

    return defaultFields;
  }, [] as string[]);
