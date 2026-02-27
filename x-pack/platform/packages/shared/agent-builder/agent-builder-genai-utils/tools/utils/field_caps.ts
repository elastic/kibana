/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldCapsResponse,
  FieldCapsFieldCapability,
} from '@elastic/elasticsearch/lib/api/types';
import type { MappingField } from './mappings';

/**
 * response for {@link processFieldCapsResponse}
 */
export interface FieldListFromFieldCapsResponse {
  /**
   * List of indices included in the field_caps response
   */
  indices: string[];
  /**
   * List of non-conflicting fields
   */
  fields: MappingField[];
}

/**
 * Process a field caps response and return the list of targeted indices and
 * the list of corresponding non-conflicting fields.
 */
export const processFieldCapsResponse = (
  fieldCapsRes: FieldCapsResponse
): FieldListFromFieldCapsResponse => {
  const indices = Array.isArray(fieldCapsRes.indices)
    ? fieldCapsRes.indices
    : [fieldCapsRes.indices];

  const fields = Object.entries(fieldCapsRes.fields)
    .filter(([path, entry]) => {
      // exclude conflicting fields
      if (Object.keys(entry).length !== 1) {
        return false;
      }
      // exclude fields with internal types
      if (Object.keys(entry)[0].startsWith('_')) {
        return false;
      }

      return true;
    })
    .map(([path, entry]) => {
      return processField(path, entry);
    });

  return { indices, fields };
};

export const processFieldCapsResponsePerIndex = (
  fieldCapsRes: FieldCapsResponse
): Record<string, MappingField[]> => {
  const allIndices = Array.isArray(fieldCapsRes.indices)
    ? (fieldCapsRes.indices as string[])
    : [fieldCapsRes.indices as string];

  const result: Record<string, MappingField[]> = {};
  for (const idx of allIndices) {
    result[idx] = [];
  }

  for (const [path, entry] of Object.entries(fieldCapsRes.fields)) {
    for (const [typeName, capability] of Object.entries(entry)) {
      if (typeName.startsWith('_')) {
        continue;
      }

      const meta = extractMeta(capability);
      const field: MappingField = { path, type: capability.type, meta };

      const targetIndices =
        capability.indices == null
          ? allIndices
          : Array.isArray(capability.indices)
          ? (capability.indices as string[])
          : [capability.indices as string];

      for (const idx of targetIndices) {
        result[idx]?.push(field);
      }
    }
  }

  return result;
};

const extractMeta = (fieldCaps: FieldCapsFieldCapability): Record<string, string> => {
  if (!fieldCaps.meta) {
    return {};
  }
  return Object.entries(fieldCaps.meta).reduce((acc, [key, value]) => {
    acc[key] = Array.isArray(value) ? value.join(',') : `${value}`;
    return acc;
  }, {} as Record<string, string>);
};

const processField = (
  path: string,
  entry: Record<string, FieldCapsFieldCapability>
): MappingField => {
  if (Object.keys(entry).length > 1 || Object.keys(entry).length === 0) {
    throw new Error(`Trying to process field with conflicting types: ${path}`);
  }

  const fieldCaps = Object.values(entry)[0];
  const meta = extractMeta(fieldCaps);

  return {
    path,
    type: fieldCaps.type,
    meta,
  };
};
