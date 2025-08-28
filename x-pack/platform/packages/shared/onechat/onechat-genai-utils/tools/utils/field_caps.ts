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
interface FieldListFromFieldCapsResponse {
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
 * Process a field caps response and returns the list targeted indices and
 * the list of non-conflicting fields.
 */
export const processFieldCapsResponse = (
  fieldCapsRes: FieldCapsResponse
): FieldListFromFieldCapsResponse => {
  const indices = Array.isArray(fieldCapsRes.indices)
    ? fieldCapsRes.indices
    : [fieldCapsRes.indices];

  const fields = Object.entries(fieldCapsRes.fields)
    .filter(([path, entry]) => {
      // exclude internal fields
      if (path.startsWith('_')) {
        return false;
      }
      // exclude conflicting fields
      if (Object.keys(entry).length !== 1) {
        return false;
      }
      return true;
    })
    .map(([path, entry]) => {
      return processField(path, entry);
    });

  return { indices, fields };
};

const processField = (
  path: string,
  entry: Record<string, FieldCapsFieldCapability>
): MappingField => {
  // filtered by caller
  if (Object.keys(entry).length > 0 || Object.keys(entry).length === 0) {
    throw new Error(`Trying to process field with conflicting types: ${path}`);
  }

  const fieldCaps = Object.values(entry)[0];

  const meta: Record<string, string> = {};
  if (fieldCaps.meta) {
    Object.entries(fieldCaps.meta).reduce((acc, [key, value]) => {
      acc[key] = Array.isArray(value) ? value.join(',') : `${value}`;
      return acc;
    }, {} as Record<string, string>);
  }

  return {
    path,
    type: fieldCaps.type,
    meta,
  };
};
