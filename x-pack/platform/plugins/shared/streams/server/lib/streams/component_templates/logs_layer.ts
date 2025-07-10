/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexSettings, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import {
  FieldDefinition,
  InheritedFieldDefinition,
  Streams,
  namespacePrefixes,
} from '@kbn/streams-schema';

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
  'scope.dropped_attributes_count': {
    type: 'long',
  },
  dropped_attributes_count: {
    type: 'long',
  },
  'resource.dropped_attributes_count': {
    type: 'long',
  },
  'resource.schema_url': {
    type: 'keyword',
  },
  'scope.name': {
    type: 'keyword',
  },
  'scope.schema_url': {
    type: 'keyword',
  },
  'scope.version': {
    type: 'keyword',
  },
  observed_timestamp: {
    type: 'date',
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
};

export const baseMappings: Record<string, MappingProperty> = {
  body: {
    type: 'object',
    properties: {
      structured: {
        type: 'flattened',
      },
      text: {
        type: 'match_only_text',
      },
    },
  },
  attributes: {
    type: 'object',
    subobjects: false,
  },
  resource: {
    type: 'object',
    properties: {
      dropped_attributes_count: {
        type: 'long',
      },
      schema_url: {
        ignore_above: 1024,
        type: 'keyword',
      },
      attributes: {
        type: 'object',
        subobjects: false,
      },
    },
  },
  scope: {
    type: 'object',
    properties: {
      attributes: {
        type: 'object',
        subobjects: false,
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
