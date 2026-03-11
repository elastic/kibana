/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';

interface SampleObj {
  [key: string]: unknown;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEmptyValue = (value: unknown): boolean => {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
};

const isUnsafeProperty = (key: string): boolean =>
  key === '__proto__' || key === 'constructor' || key === 'prototype';

const merge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> => {
  const result = Object.create(null) as Record<string, unknown>;

  for (const [key, value] of Object.entries(target)) {
    if (!isUnsafeProperty(key)) {
      result[key] = value;
    }
  }

  for (const [key, sourceValue] of Object.entries(source)) {
    if (isUnsafeProperty(key)) continue;
    const targetValue = result[key];

    if (Array.isArray(sourceValue)) {
      result[key] = [...sourceValue];
    } else if (isObject(sourceValue)) {
      if (!isObject(targetValue) || isEmptyValue(targetValue)) {
        result[key] = merge(Object.create(null), sourceValue);
      } else {
        result[key] = merge(targetValue, sourceValue);
      }
    } else if (!(key in result) || (isEmptyValue(targetValue) && !isEmptyValue(sourceValue))) {
      result[key] = sourceValue;
    }
  }

  return result;
};

export const mergeSamples = (docs: Array<Record<string, unknown>>): SampleObj => {
  let result: Record<string, unknown> = {};
  for (const doc of docs) {
    result = merge(result, doc);
  }
  return result;
};

const determineType = (value: unknown): string => {
  if (typeof value === 'object' && value !== null) return 'group';
  if (typeof value === 'string') return 'keyword';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'long';
  return 'keyword';
};

interface RawField {
  name: string;
  type: string;
}

const collectFields = (obj: unknown, parentPath: string): RawField[] => {
  if (typeof obj !== 'object' || obj === null) {
    return [{ name: parentPath, type: determineType(obj) }];
  }

  if (Array.isArray(obj)) {
    if (obj.length > 0 && isObject(obj[0])) {
      return collectFields(obj[0], parentPath);
    }
    return [{ name: parentPath, type: determineType(obj[0]) }];
  }

  const fields: RawField[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (isUnsafeProperty(key)) continue;
    const fieldPath = parentPath ? `${parentPath}.${key}` : key;
    fields.push(...collectFields(value, fieldPath));
  }
  return fields;
};

/**
 * Generates field mappings from pipeline output documents.
 * Merges all docs into a single representative object, walks the structure,
 * and produces a flat list of fields with their types and ECS status.
 *
 * ECS status is determined by querying the fields_metadata plugin which
 * maintains the canonical list of ECS field definitions.
 */
export const generateFieldMappings = async (
  pipelineDocs: Array<Record<string, unknown>>,
  fieldsMetadataClient: IFieldsMetadataClient
): Promise<FieldMappingEntry[]> => {
  if (pipelineDocs.length === 0) return [];

  const merged = mergeSamples(pipelineDocs);
  const rawFields: RawField[] = [];

  for (const [key, value] of Object.entries(merged)) {
    if (isUnsafeProperty(key)) continue;
    rawFields.push(...collectFields(value, key));
  }

  if (rawFields.length === 0) return [];

  const allFieldNames = rawFields.map((f) => f.name);
  const ecsFieldsDict = await fieldsMetadataClient.find({
    fieldNames: allFieldNames,
    source: ['ecs'],
  });
  const ecsFieldsMap = ecsFieldsDict.toPlain();

  return rawFields.map((f) => ({
    ...f,
    is_ecs: f.name in ecsFieldsMap,
  }));
};
