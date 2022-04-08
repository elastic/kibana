/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsMapping } from './types.ts';
import { ensureJsonObject } from './util.ts';

export function readEsMappings(
  name: string,
  data: unknown,
  path: string[] = []
): EsMapping | string {
  path = path.concat(name);
  const currPath = path.join('.');

  const dataObject = ensureJsonObject(data);

  const type = dataObject.type ?? 'object';
  const isArray = dataObject.$is_array ?? false;
  const usage = dataObject.$usage ?? 'general';
  const description = dataObject.$description ?? '';
  const optional = dataObject.$optional ?? false;
  const nullable = dataObject.$nullable ?? false;
  const properties = dataObject.properties;

  const esParameters = JSON.parse(JSON.stringify(dataObject));
  delete esParameters.properties;

  if (typeof type !== 'string') return typeErr(currPath, 'type', type, 'string');
  if (typeof isArray !== 'boolean') return typeErr(currPath, '$isArray', isArray, 'boolean');
  if (typeof usage !== 'string') return typeErr(currPath, '$usage', usage, 'string');
  if (typeof optional !== 'boolean') return typeErr(currPath, '$optional', optional, 'boolean');
  if (typeof nullable !== 'boolean') return typeErr(currPath, '$nullable', nullable, 'boolean');
  if (typeof description !== 'string')
    return typeErr(currPath, '$description', description, 'string');

  let propMap: Record<string, EsMapping> | undefined;

  if (type !== 'object' && type !== 'nested') {
    if (properties != null) {
      // eslint-disable-next-line prettier/prettier
      return `at ${currPath}, not expecting properties property to be non-null, but was ${JSON.stringify(properties)}`;
    }
  } else {
    const props = ensureJsonObject(properties || {});
    propMap = {};
    for (const propKey of Object.keys(props)) {
      const propValue = props[propKey];
      const propMappings = readEsMappings(propKey, propValue, path);
      if (typeof propMappings === 'string') return propMappings;

      if (!propKey.startsWith('$')) {
        propMap[propKey] = propMappings;
      }
    }
  }

  return {
    name: name.trim(),
    type: type.trim(),
    description: description.trim(),
    esParameters,
    isArray,
    usage: usage.trim(),
    properties: propMap,
  };
}

function typeErr(path: string, name: string, actual: unknown, expected: string) {
  return `at ${path}, expecting ${name} property to be a ${expected}, but was ${typeof actual}`;
}
