/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  IndicesGetFieldMappingResponse,
  IndicesGetMappingResponse,
} from '@elastic/elasticsearch/lib/api/types';

export interface FieldConstraints {
  type: string;
  ignore_above?: number;
  ignore_malformed?: boolean;
  [key: string]: unknown;
}

const CONSTRAINT_KEYS = new Set([
  'type',
  'ignore_above',
  'ignore_malformed',
  'format',
  'coerce',
  'null_value',
]);

const extractConstraints = (mappingObj: Record<string, unknown>): FieldConstraints | undefined => {
  const leafEntries = Object.values(mappingObj);
  if (leafEntries.length === 0) return undefined;

  const leaf = leafEntries[0] as Record<string, unknown> | undefined;
  if (!leaf || typeof leaf !== 'object' || typeof leaf.type !== 'string') return undefined;

  const constraints: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(leaf)) {
    if (CONSTRAINT_KEYS.has(key)) {
      constraints[key] = value;
    }
  }
  return constraints as FieldConstraints;
};

export const getEffectiveFieldConstraints = async (
  esClient: ElasticsearchClient,
  streamName: string,
  fieldNames: string[]
): Promise<Map<string, FieldConstraints>> => {
  const result = new Map<string, FieldConstraints>();
  if (fieldNames.length === 0) return result;

  const response: IndicesGetFieldMappingResponse = await esClient.indices.getFieldMapping({
    index: streamName,
    fields: fieldNames,
  });

  // Response shape: { "<index>": { mappings: { "<field>": { full_name, mapping: { "<leaf>": { type, ... } } } } } }
  // Use the first index entry (the backing index resolved from the data stream name).
  const firstIndex = Object.values(response)[0];
  if (!firstIndex?.mappings) return result;

  for (const [fieldPath, fieldMapping] of Object.entries(firstIndex.mappings)) {
    const mapping = (fieldMapping as { mapping?: Record<string, unknown> }).mapping;
    if (!mapping) continue;

    const constraints = extractConstraints(mapping);
    if (constraints) {
      result.set(fieldPath, constraints);
    }
  }

  return result;
};

/**
 * Extracts the root-level `dynamic` mapping setting from an indices.getMapping response.
 * Uses the last index entry (the write index for a data stream). Defaults to 'true'
 * per the Elasticsearch default when the setting is absent.
 */
export const getEffectiveDynamicMapping = (mappingResponse: IndicesGetMappingResponse): string => {
  const indices = Object.values(mappingResponse);
  const writeIndex = indices[indices.length - 1];
  return String(writeIndex?.mappings?.dynamic ?? 'true');
};

/**
 * Derives an agent-facing note explaining what "unmapped" means given the
 * stream's effective `dynamic` mapping setting.
 */
export const getUnmappedFieldsNote = (dynamic: string | boolean): string => {
  const val = String(dynamic);
  if (val === 'false') {
    return (
      'This stream uses dynamic: false — unmapped fields are stored in _source only ' +
      '(not indexed, not searchable, not aggregatable). ' +
      'Add explicit field mappings to make them queryable.'
    );
  }
  if (val === 'strict') {
    return (
      'This stream uses dynamic: strict — unmapped fields are stored in _source only ' +
      '(not indexed, not searchable, not aggregatable).'
    );
  }
  if (val === 'runtime') {
    return (
      'This stream uses dynamic: runtime — unmapped fields are auto-mapped as runtime fields ' +
      '(searchable at query time but not indexed on disk).'
    );
  }
  return (
    'This stream uses dynamic: true — unmapped fields listed here were not found in either ' +
    'the stream field_overrides or the index template field caps. ' +
    'They may be present only in _source, or they may have appeared after the field caps snapshot.'
  );
};
