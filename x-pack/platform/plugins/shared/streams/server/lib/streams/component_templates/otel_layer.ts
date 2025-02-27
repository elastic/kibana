/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesIndexSettings,
  MappingObjectProperty,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import {
  FieldDefinition,
  InheritedFieldDefinition,
  WiredStreamDefinition,
} from '@kbn/streams-schema';
import { getSortedFields } from '../helpers/field_sorting';

export const otelSettings: IndicesIndexSettings = {
  index: {
    mode: 'logsdb',
    sort: {
      field: ['resource.attributes.host.name', '@timestamp'],
    },
  },
};

export const otelPrefixes = [
  'body.structured.',
  'attributes.',
  'scope.attributes.',
  'resource.attributes.',
];

export const otelFields: FieldDefinition = {
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
  severity_text: {
    type: 'keyword',
  },
  'body.text': {
    type: 'match_only_text',
  },
  'severity.number': {
    type: 'long',
  },
  'attributes.exception.type': {
    type: 'keyword',
  },
  'attributes.exception.message': {
    type: 'keyword',
  },
  'data_stream.dataset': {
    type: 'keyword',
  },
  'attributes.exception.stacktrace': {
    type: 'match_only_text',
  },
  'resource.attributes.host.name': {
    type: 'keyword',
  },
};

export const otelMappings: Record<string, MappingProperty> = {
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
  'error.exception.type': {
    path: 'attributes.exception.type',
    type: 'alias',
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
  'error.stack_trace': {
    path: 'attributes.exception.stacktrace',
    type: 'alias',
  },
  'error.exception.message': {
    path: 'attributes.exception.message',
    type: 'alias',
  },
  'event.dataset': {
    path: 'data_stream.dataset',
    type: 'alias',
  },
};

/* Goes through the top level record and if a field in there starts with attributes,
   put it into attributes.properties (and cut the attributes prefix). Same for resource.attributes.

   This is necessary because of an Elasticsearch issue that requires all fields to be in the properties,
   as the merge later on doesn't work
*/
export function moveFieldsToProperties(mappings: Record<string, MappingProperty>) {
  const attributes: Record<string, MappingProperty> = {};
  const resourceAttributes: Record<string, MappingProperty> = {};
  for (const [field, props] of Object.entries(mappings)) {
    if (field.startsWith('attributes.')) {
      attributes[field.replace('attributes.', '')] = props;
      delete mappings[field];
    } else if (field.startsWith('resource.attributes.')) {
      resourceAttributes[field.replace('resource.attributes.', '')] = props;
      delete mappings[field];
    }
  }
  if (Object.keys(attributes).length > 0) {
    (mappings.attributes as MappingObjectProperty).properties = attributes;
  }
  if (Object.keys(resourceAttributes).length > 0) {
    (
      (mappings.resource as MappingObjectProperty).properties?.attributes as MappingObjectProperty
    ).properties = resourceAttributes;
  }
  return mappings;
}

export function addAliasesForOtelFields(
  streamDefinition: WiredStreamDefinition,
  inheritedFields: InheritedFieldDefinition
) {
  // calculate aliases for all fields based on their prefixes and add them to the inherited fields
  getSortedFields(inheritedFields).forEach(([key, fieldDef]) => {
    // if the field starts with one of the otel prefixes, add an alias without the prefix
    if (otelPrefixes.some((prefix) => key.startsWith(prefix))) {
      inheritedFields[key.replace(new RegExp(`^(${otelPrefixes.join('|')})`), '')] = {
        ...fieldDef,
        from: inheritedFields[key].from,
        alias_for: key,
      };
    }
  });
  // calculate aliases for regular fields of this stream
  getSortedFields(streamDefinition.ingest.wired.fields).forEach(([key, fieldDef]) => {
    if (otelPrefixes.some((prefix) => key.startsWith(prefix))) {
      inheritedFields[key.replace(new RegExp(`^(${otelPrefixes.join('|')})`), '')] = {
        ...fieldDef,
        from: streamDefinition.name,
        alias_for: key,
      };
    }
  });
  // add aliases defined by the otel compat mode itself
  Object.entries(otelMappings).forEach(([key, fieldDef]) => {
    if (fieldDef.type === 'alias') {
      inheritedFields[key] = {
        type: otelFields[fieldDef.path!].type,
        alias_for: fieldDef.path,
        from: 'logs',
      };
    }
  });

  return inheritedFields;
}
