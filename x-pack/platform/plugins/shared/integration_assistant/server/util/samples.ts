/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { dump } from 'js-yaml';
import type { CategorizationState, EcsMappingState, RelatedState } from '../types';

interface SampleObj {
  [key: string]: unknown;
}

interface NewObj {
  [key: string]: {
    [key: string]: SampleObj;
  };
}

export interface Field {
  name: string;
  type: string;
  description?: string;
  fields?: Field[];
}

// Given a graph state, it collects the rawSamples (array of JSON strings) and prefixes them with the packageName and dataStreamName, returning an array of prefixed JSON strings.
export function prefixSamples(
  state: EcsMappingState | CategorizationState | RelatedState
): string[] {
  const modifiedSamples: string[] = [];
  const rawSamples = state.rawSamples;
  const packageName = state.packageName;
  const dataStreamName = state.dataStreamName;

  for (const sample of rawSamples) {
    const sampleObj: SampleObj = JSON.parse(sample);
    const newObj: NewObj = {
      [packageName]: {
        [dataStreamName]: sampleObj,
      },
    };
    const modifiedSample = JSON.stringify(newObj);
    modifiedSamples.push(modifiedSample);
  }

  return modifiedSamples;
}

function determineType(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return 'group';
    }
    return 'group';
  }
  if (typeof value === 'string') {
    return 'keyword';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (typeof value === 'number') {
    return 'long';
  }
  return 'keyword'; // Default type for null or other undetermined types
}

function recursiveParse(obj: unknown, path: string[]): Field {
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      // Assume list elements are uniform and use the first element as representative
      if (obj.length > 0) {
        return recursiveParse(obj[0], path);
      }
      return { name: path[path.length - 1], type: 'group', fields: [] };
    }
    const fields: Field[] = [];
    for (const [key, value] of Object.entries(obj)) {
      fields.push(recursiveParse(value, path.concat(key)));
    }
    return { name: path[path.length - 1], type: 'group', fields };
  }
  return { name: path[path.length - 1], type: determineType(obj) };
}

export function generateFields(mergedDocs: string): string {
  const ecsTopKeysSet: Set<string> = new Set([
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

  const doc: SampleObj = JSON.parse(mergedDocs);
  const fieldsStructure: Field[] = Object.keys(doc)
    .filter((key) => !ecsTopKeysSet.has(key))
    .map((key) => recursiveParse(doc[key], [key]));

  return dump(fieldsStructure, { sortKeys: false });
}

export function merge(
  target: Record<string, any>,
  source: Record<string, any>
): Record<string, unknown> {
  const filteredTarget = filterOwnProperties(target);
  for (const [key, sourceValue] of Object.entries(source)) {
    if (!isBuiltInProperties(key, source)) {
      const targetValue = filteredTarget[key];
      if (Array.isArray(sourceValue)) {
        // Directly assign arrays
        filteredTarget[key] = sourceValue;
      } else if (isObject(sourceValue) && !Array.isArray(targetValue)) {
        if (!isObject(targetValue) || isEmptyValue(targetValue)) {
          filteredTarget[key] = merge({}, sourceValue);
        } else {
          filteredTarget[key] = merge(targetValue, sourceValue);
        }
      } else if (
        !(key in filteredTarget) ||
        (isEmptyValue(targetValue) && !isEmptyValue(sourceValue))
      ) {
        filteredTarget[key] = sourceValue;
      }
    }
  }
  return filteredTarget;
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (isObject(value)) {
    if (Array.isArray(value)) return value.length === 0;
    return value && Object.keys(value).length === 0;
  }
  return false;
}

function isObject(value: any): boolean {
  return typeof value === 'object' && value !== null;
}

function isBuiltInProperties(key: string, obj: Record<string, any>): boolean {
  return key === 'constructor' || !Object.prototype.hasOwnProperty.call(obj, key);
}

function filterOwnProperties(obj: Record<string, any>): Record<string, any> {
  const ownProps: Record<string, any> = {};

  for (const key of Object.getOwnPropertyNames(obj)) {
    if (!isBuiltInProperties(key, obj)) {
      ownProps[key] = (obj as any)[key];
    }
  }

  return ownProps;
}

export function mergeSamples(objects: any[]): string {
  let result: Record<string, unknown> = {};

  for (const obj of objects) {
    let sample: Record<string, unknown> = obj;
    if (typeof obj === 'string') {
      sample = JSON.parse(obj);
    }
    result = merge(result, sample);
  }

  return JSON.stringify(result, null, 2);
}

export function flattenObjectsList(
  obj: Field[]
): Array<{ name: string; type: string; description?: string }> {
  const result: Array<{ name: string; type: string; description?: string }> = [];
  flattenObject(obj, '', '.', result);

  return sortArrayOfObjects(result);
}

function flattenObject(
  obj: Field[],
  parentKey: string = '',
  separator: string = '.',
  result: Array<{ name: string; type: string; description?: string }>
): void {
  obj.forEach((element) => {
    if (element.name) {
      const newKey = parentKey ? `${parentKey}${separator}${element.name}` : element.name;

      if (element.fields && Array.isArray(element.fields)) {
        flattenObject(element.fields, newKey, separator, result);
      } else {
        result.push({
          name: newKey,
          type: element.type,
          description: element.description,
        });
      }
    }
  });
}

function sortArrayOfObjects(
  objectsArray: Array<{ name: string; type: string; description?: string }>
): Array<{ name: string; type: string; description?: string }> {
  return objectsArray.sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
}
