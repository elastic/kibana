/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldCapsFieldCapability,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import {
  MAX_AI_INDEX_DESCRIBE_FIELDS,
  MAX_AI_INDEX_DESCRIBE_METADATA_BYTES,
} from '../../common/constants';
import type { AiIndexField } from '../../common/http_api/ai_indices';
import { AiIndexDescribeResponseTooLargeError } from './errors';

export const CONFLICT_FIELD_TYPE = 'conflict';
const SEMANTIC_TEXT_TYPE = 'semantic_text';

interface MappingProperties {
  [key: string]: {
    type?: string;
    properties?: MappingProperties;
    fields?: MappingProperties;
  };
}

export interface AiIndexFieldsDescription {
  fields: AiIndexField[];
  semantic_fields: string[];
  truncated: boolean;
}

export interface DescribeAiIndexFieldsParams {
  esClient: ElasticsearchClient;
  /** `dest.value`: index, data stream, or pattern. */
  target: string;
}

/** `[path, type]` per typed property, containers and multi-fields included. */
const flattenMappingTypes = (mapping: MappingTypeMapping): Array<[string, string]> => {
  const walk = (properties: MappingProperties, prefix: string): Array<[string, string]> =>
    Object.entries(properties).flatMap(([name, property]) => {
      const path = prefix ? `${prefix}.${name}` : name;
      const own: Array<[string, string]> = property.type ? [[path, property.type]] : [];
      return [
        ...own,
        ...(property.properties ? walk(property.properties, path) : []),
        ...(property.fields ? walk(property.fields, path) : []),
      ];
    });
  return walk(mapping.properties ?? {}, '');
};

/** True only if every `_field_caps` type entry for path supports it. */
const mergeCapabilities = (caps: Record<string, FieldCapsFieldCapability> | undefined) => {
  const entries = Object.values(caps ?? {});
  return {
    searchable: entries.length > 0 && entries.every((cap) => cap.searchable),
    aggregatable: entries.length > 0 && entries.every((cap) => cap.aggregatable),
  };
};

const byPath = (a: AiIndexField, b: AiIndexField) =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

/**
 * Types from `_mapping`, `searchable`/`aggregatable` from `_field_caps`. Mixed types across
 * indices: `conflict`. `semantic_fields` is a subset of capped `fields`.
 */
export const describeAiIndexFields = async ({
  esClient,
  target,
}: DescribeAiIndexFieldsParams): Promise<AiIndexFieldsDescription> => {
  const indexOptions = { index: target, ignore_unavailable: true, allow_no_indices: true };
  const transportOptions = { maxResponseSize: MAX_AI_INDEX_DESCRIBE_METADATA_BYTES };
  const [mappings, fieldCaps] = await Promise.all([
    esClient.indices.getMapping(indexOptions, transportOptions),
    esClient.fieldCaps({ ...indexOptions, fields: '*' }, transportOptions),
  ]).catch((error) => {
    if (isMaximumResponseSizeExceededError(error)) {
      throw new AiIndexDescribeResponseTooLargeError(MAX_AI_INDEX_DESCRIBE_METADATA_BYTES);
    }
    throw error;
  });

  const typesByPath = new Map<string, Set<string>>();
  for (const { mappings: mapping } of Object.values(mappings)) {
    for (const [path, type] of flattenMappingTypes(mapping)) {
      typesByPath.set(path, (typesByPath.get(path) ?? new Set<string>()).add(type));
    }
  }

  const allFields = [...typesByPath.entries()]
    .map(([path, types]) => ({
      path,
      type: types.size === 1 ? [...types][0] : CONFLICT_FIELD_TYPE,
      ...mergeCapabilities(fieldCaps.fields[path]),
    }))
    .sort(byPath);

  const fields = allFields.slice(0, MAX_AI_INDEX_DESCRIBE_FIELDS);
  return {
    fields,
    semantic_fields: fields
      .filter(({ type, searchable }) => type === SEMANTIC_TEXT_TYPE && searchable)
      .map(({ path }) => path),
    truncated: allFields.length > MAX_AI_INDEX_DESCRIBE_FIELDS,
  };
};
