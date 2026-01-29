/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  MappingDateProperty,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  AllowedMappingProperty,
  StreamsMappingProperties,
} from '@kbn/streams-schema/src/fields';
import type { Streams } from '@kbn/streams-schema';
import { getAdvancedParameters, isRoot, namespacePrefixes } from '@kbn/streams-schema';
import { ASSET_VERSION } from '../../../../common/constants';
import {
  logsSettings,
  baseMappings,
  NAMESPACE_PRIORITIES,
  otelEquivalentLookupMap,
  REQUIRED_RESOURCE_ATTRIBUTES_FIELDS,
} from './logs_layer';
import { getComponentTemplateName } from './name';

function buildNamespaceStructure(
  prefix: string,
  properties: MappingTypeMapping['properties']
): MappingTypeMapping['properties'] {
  const priority = NAMESPACE_PRIORITIES[prefix] || 10;

  switch (prefix) {
    case 'body.structured.':
      return {
        body: {
          type: 'object',
          properties: {
            structured: {
              type: 'passthrough',
              priority,
              properties,
            },
          },
        },
      };
    case 'attributes.':
      return {
        attributes: {
          type: 'passthrough',
          priority,
          properties,
        },
      };
    case 'resource.attributes.':
      return {
        resource: {
          type: 'object',
          properties: {
            attributes: {
              type: 'passthrough',
              priority,
              // Always include required fields (used for index sorting) plus stream-specific fields
              properties: { ...REQUIRED_RESOURCE_ATTRIBUTES_FIELDS, ...properties },
            },
          },
        },
      };
    case 'scope.attributes.':
      return {
        scope: {
          type: 'object',
          properties: {
            attributes: {
              type: 'passthrough',
              priority,
              properties,
            },
          },
        },
      };
    default:
      return {};
  }
}

/**
 * Builds OTel-to-ECS equivalent aliases.
 * For fields with namespace prefixes, checks if there's an ECS equivalent
 * and creates an explicit alias for it.
 *
 * Example: attributes.http.request.size -> http.request.bytes alias
 */
function buildOtelEquivalentAliases(
  properties: StreamsMappingProperties
): MappingTypeMapping['properties'] {
  const aliases: MappingTypeMapping['properties'] = {};

  Object.keys(properties).forEach((fieldName) => {
    const matchingPrefix = namespacePrefixes.find((prefix) => fieldName.startsWith(prefix));
    if (matchingPrefix) {
      const aliasName = fieldName.substring(matchingPrefix.length);
      const otelEquivalent = otelEquivalentLookupMap[aliasName];
      if (otelEquivalent) {
        aliases[otelEquivalent] = {
          type: 'alias',
          path: fieldName,
        };
      }
    }
  });

  return aliases;
}

/**
 * Builds namespace passthrough objects containing fields.
 * Groups fields by their namespace prefix and creates passthrough objects
 * that will automatically generate aliases in Elasticsearch.
 */
function buildPassthroughProperties(
  properties: StreamsMappingProperties
): MappingTypeMapping['properties'] {
  // Group fields by their namespace prefix
  const fieldsByNamespace: Record<string, MappingTypeMapping['properties']> = {};
  const nonNamespacedFields: MappingTypeMapping['properties'] = {};

  Object.entries(properties).forEach(([fieldName, fieldDef]) => {
    const matchingPrefix = namespacePrefixes.find((prefix) => fieldName.startsWith(prefix));
    if (matchingPrefix) {
      // Strip the prefix to get the field name within the namespace
      const fieldNameWithinNamespace = fieldName.substring(matchingPrefix.length);
      if (!fieldsByNamespace[matchingPrefix]) {
        fieldsByNamespace[matchingPrefix] = {};
      }
      fieldsByNamespace[matchingPrefix]![fieldNameWithinNamespace] = fieldDef;
    } else {
      // Non-namespaced fields go at root level
      nonNamespacedFields[fieldName] = fieldDef;
    }
  });

  // Build the final properties object
  // Each namespace produces a unique top-level key, so simple spreading works
  let result: MappingTypeMapping['properties'] = { ...nonNamespacedFields };

  Object.entries(fieldsByNamespace).forEach(([prefix, namespaceFields]) => {
    result = { ...result, ...buildNamespaceStructure(prefix, namespaceFields) };
  });

  return result;
}

export function generateLayer(
  name: string,
  definition: Streams.WiredStream.Definition,
  isServerless: boolean
): ClusterPutComponentTemplateRequest {
  const properties: StreamsMappingProperties = {};

  Object.entries(definition.ingest.wired.fields).forEach(([field, props]) => {
    if (props.type === 'system') {
      return;
    }
    const property: AllowedMappingProperty = {
      type: props.type,
    };

    const advancedParameters = getAdvancedParameters(field, props);

    if (Object.keys(advancedParameters).length > 0) {
      Object.assign(property, advancedParameters);
    }

    if (field === '@timestamp') {
      // @timestamp can't ignore malformed dates as it's used for sorting in logsdb
      (property as MappingDateProperty).ignore_malformed = false;
    }
    if (props.type === 'date' && props.format) {
      (property as MappingDateProperty).format = props.format;
    }

    properties[field] = property;
  });

  const passthroughProperties = buildPassthroughProperties(properties);

  // Build OTel-to-ECS equivalent aliases
  const otelAliases = buildOtelEquivalentAliases(properties);

  // For root streams, include baseMappings (passthrough definitions + static aliases)
  // For child streams, just use the built passthrough properties
  // OTel aliases are added to both
  const mappingProperties = isRoot(name)
    ? { ...baseMappings, ...passthroughProperties, ...otelAliases }
    : { ...passthroughProperties, ...otelAliases };

  const result = {
    name: getComponentTemplateName(name),
    template: {
      settings: getTemplateSettings(definition, isServerless),
      mappings: {
        dynamic: false,
        properties: mappingProperties,
      },
    },
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `Default settings for the ${name} stream`,
    },
  };

  return result;
}

function getTemplateSettings(definition: Streams.WiredStream.Definition, isServerless: boolean) {
  const baseSettings = isRoot(definition.name) ? logsSettings : {};
  return baseSettings;
}
