/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';

export const ECS_TOP_KEYS: ReadonlySet<string> = new Set([
  '@timestamp',
  'agent',
  'as',
  'base',
  'client',
  'cloud',
  'code_signature',
  'container',
  'data_stream',
  'destination',
  'device',
  'dll',
  'dns',
  'ecs',
  'elf',
  'email',
  'error',
  'event',
  'faas',
  'file',
  'geo',
  'group',
  'hash',
  'host',
  'http',
  'interface',
  'labels',
  'log',
  'macho',
  'message',
  'network',
  'observer',
  'orchestrator',
  'organization',
  'os',
  'package',
  'pe',
  'process',
  'registry',
  'related',
  'risk',
  'rule',
  'server',
  'service',
  'source',
  'tags',
  'threat',
  'tls',
  'tracing',
  'url',
  'user',
  'user_agent',
  'vlan',
  'volume',
  'vulnerability',
  'x509',
]);

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

const collectFields = (
  obj: unknown,
  parentPath: string,
  topLevelKey: string
): FieldMappingEntry[] => {
  if (typeof obj !== 'object' || obj === null) {
    return [
      {
        name: parentPath,
        type: determineType(obj),
        is_ecs: ECS_TOP_KEYS.has(topLevelKey),
      },
    ];
  }

  if (Array.isArray(obj)) {
    if (obj.length > 0 && isObject(obj[0])) {
      return collectFields(obj[0], parentPath, topLevelKey);
    }
    return [
      {
        name: parentPath,
        type: determineType(obj[0]),
        is_ecs: ECS_TOP_KEYS.has(topLevelKey),
      },
    ];
  }

  const fields: FieldMappingEntry[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (isUnsafeProperty(key)) continue;
    const fieldPath = parentPath ? `${parentPath}.${key}` : key;
    fields.push(...collectFields(value, fieldPath, topLevelKey));
  }
  return fields;
};

/**
 * Generates field mappings from pipeline output documents.
 * Merges all docs into a single representative object, walks the structure,
 * and produces a flat list of fields with their types and ECS status.
 *
 * A field is marked `is_ecs: true` when its top-level key belongs to the
 * Elastic Common Schema (ECS_TOP_KEYS set).
 */
export const generateFieldMappings = (
  pipelineDocs: Array<Record<string, unknown>>
): FieldMappingEntry[] => {
  if (pipelineDocs.length === 0) return [];

  const merged = mergeSamples(pipelineDocs);
  const fields: FieldMappingEntry[] = [];

  for (const [key, value] of Object.entries(merged)) {
    if (isUnsafeProperty(key)) continue;
    fields.push(...collectFields(value, key, key));
  }

  return fields;
};
