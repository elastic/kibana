/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/**
 * ## IMPORTANT TODO ##
 * This file imports @elastic/ecs directly, which imports all ECS fields into the bundle.
 * This should be migrated to using the unified fields metadata plugin instead.
 * See https://github.com/elastic/kibana/tree/main/x-pack/platform/plugins/shared/fields_metadata for more details.
 */
// eslint-disable-next-line no-restricted-imports
import { EcsFlat } from '@elastic/ecs';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import { namespacePrefixes } from '@kbn/streams-schema';
import type { FieldDefinition, InheritedFieldDefinition, Streams } from '@kbn/streams-schema';

// This map is used to find the ECS equivalent field for a given OpenTelemetry attribute.
export const otelEquivalentLookupMap = Object.fromEntries(
  Object.entries(EcsFlat).flatMap(([fieldName, field]) => {
    if (!('otel' in field) || !field.otel) {
      return [];
    }
    const otelEquivalentProperty = field.otel.find(
      (otelProperty) => otelProperty.relation === 'equivalent'
    );
    if (
      !otelEquivalentProperty ||
      !('attribute' in otelEquivalentProperty) ||
      !(typeof otelEquivalentProperty.attribute === 'string')
    ) {
      return [];
    }

    return [[otelEquivalentProperty.attribute, fieldName]];
  })
);

export const logsSettings: IndicesIndexSettings = {
  index: {
    mode: 'logsdb',
    codec: 'best_compression',
    sort: {
      field: ['resource.attributes.host.name', '@timestamp'],
      order: ['asc', 'desc'],
    },
    mapping: {
      total_fields: {
        ignore_dynamic_beyond_limit: true,
      },
      ignore_malformed: true,
    },
  },
};

export const baseFields: FieldDefinition = {
  '@timestamp': {
    type: 'date',
  },
  'stream.name': {
    type: 'system',
  },
  'scope.name': {
    type: 'keyword',
  },
  trace_id: {
    type: 'keyword',
  },
  span_id: {
    type: 'keyword',
  },
  event_name: {
    type: 'keyword',
  },
  severity_text: {
    type: 'keyword',
  },
  'body.text': {
    type: 'match_only_text',
  },
  severity_number: {
    type: 'long',
  },
  'resource.attributes.host.name': {
    type: 'keyword',
  },
  'resource.attributes.service.name': {
    type: 'keyword',
  },
};

// Priorities match the order in NAMESPACE_PREFIXES (kbn-streamlang/src/validation/constants.ts)
export const NAMESPACE_PRIORITIES: Record<string, number> = {
  'body.structured.': 10,
  'attributes.': 20,
  'scope.attributes.': 30,
  'resource.attributes.': 40,
};

// Fields that MUST be present in every resource.attributes passthrough because they're used for index sorting.
// When child streams override resource.attributes, these fields must be preserved.
// Now that we pass an object (passthrough) instead of a flat key, ES replaces the whole thing when merging, so we need to always send it.
export const REQUIRED_RESOURCE_ATTRIBUTES_FIELDS = {
  'host.name': { type: 'keyword' as const },
  'service.name': { type: 'keyword' as const },
};

export const baseMappings: Exclude<MappingTypeMapping['properties'], undefined> = {
  body: {
    type: 'object',
    properties: {
      structured: {
        type: 'passthrough',
        priority: NAMESPACE_PRIORITIES['body.structured.'],
      },
    },
  },
  attributes: {
    type: 'passthrough',
    priority: NAMESPACE_PRIORITIES['attributes.'],
  },
  scope: {
    type: 'object',
    properties: {
      attributes: {
        type: 'passthrough',
        priority: NAMESPACE_PRIORITIES['scope.attributes.'],
      },
    },
  },
  resource: {
    type: 'object',
    properties: {
      attributes: {
        type: 'passthrough',
        priority: NAMESPACE_PRIORITIES['resource.attributes.'],
        // Required fields for index sorting - must always be present
        properties: REQUIRED_RESOURCE_ATTRIBUTES_FIELDS,
      },
    },
  },
  'span.id': {
    path: 'span_id',
    type: 'alias',
  },
  message: {
    path: 'body.text',
    type: 'alias',
  },
  'trace.id': {
    path: 'trace_id',
    type: 'alias',
  },
  'log.level': {
    path: 'severity_text',
    type: 'alias',
  },
};

/**
 * Takes a map of fields and returns a sorted array of field names.
 * The sorting sorts fields alphabetically, but puts fields with otelPrefixes at the end in the order of the
 * prefixes array.
 */
function getSortedFields(fields: FieldDefinition) {
  return Object.entries(fields).sort(([a], [b]) => {
    const aPrefixIndex = namespacePrefixes.findIndex((prefix) => a.startsWith(prefix));
    const bPrefixIndex = namespacePrefixes.findIndex((prefix) => b.startsWith(prefix));

    if (aPrefixIndex !== -1 && bPrefixIndex === -1) {
      return 1;
    }
    if (aPrefixIndex === -1 && bPrefixIndex !== -1) {
      return -1;
    }
    if (aPrefixIndex !== -1 && bPrefixIndex !== -1) {
      return aPrefixIndex - bPrefixIndex;
    }
    return a.localeCompare(b);
  });
}

const allNamespacesRegex = new RegExp(`^(${namespacePrefixes.join('|')})`);

/**
 * Helper function that creates aliases for fields with namespace prefixes
 * @param fields - The fields to process
 * @param fromSource - The source to set in the 'from' property of the alias
 * @param targetCollection - Where to add the new aliases
 */
const createAliasesForNamespacedFields = (
  fields: FieldDefinition,
  fromSource: string | ((key: string) => string),
  targetCollection: InheritedFieldDefinition
) => {
  getSortedFields(fields).forEach(([key, fieldDef]) => {
    if (namespacePrefixes.some((prefix) => key.startsWith(prefix))) {
      const aliasKey = key.replace(allNamespacesRegex, '');
      const from = typeof fromSource === 'function' ? fromSource(key) : fromSource;

      targetCollection[aliasKey] = {
        ...fieldDef,
        from,
        alias_for: key,
      };
    }
  });
  // check whether the field has an otel equivalent. If yes, set the ECS equivalent as an alias
  // This needs to be done after the initial properties are set, so the ECS equivalent aliases win out
  getSortedFields(fields).forEach(([key, fieldDef]) => {
    if (namespacePrefixes.some((prefix) => key.startsWith(prefix))) {
      const aliasKey = key.replace(allNamespacesRegex, '');
      const from = typeof fromSource === 'function' ? fromSource(key) : fromSource;

      const otelEquivalent = otelEquivalentLookupMap[aliasKey];
      if (otelEquivalent) {
        targetCollection[otelEquivalent] = {
          ...fieldDef,
          from,
          alias_for: key,
        };
      }
    }
  });
};

export function addAliasesForNamespacedFields(
  streamDefinition: Streams.WiredStream.Definition,
  inheritedFields: InheritedFieldDefinition
) {
  // Create aliases for inherited fields
  createAliasesForNamespacedFields(
    inheritedFields,
    (key) => inheritedFields[key].from,
    inheritedFields
  );

  // Create aliases for this stream's fields
  createAliasesForNamespacedFields(
    streamDefinition.ingest.wired.fields,
    streamDefinition.name,
    inheritedFields
  );

  // Add aliases defined in the base mappings
  Object.entries(baseMappings).forEach(([key, fieldDef]) => {
    if (fieldDef.type === 'alias') {
      inheritedFields[key] = {
        type: baseFields[fieldDef.path!].type,
        alias_for: fieldDef.path,
        from: 'logs',
      };
    }
  });

  return inheritedFields;
}
