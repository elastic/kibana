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
  const description = dataObject.$description ?? '';
  const properties = dataObject.properties;

  const esParameters = JSON.parse(JSON.stringify(dataObject));
  delete esParameters.$isArray;
  delete esParameters.$description;
  delete esParameters.properties;

  if (typeof type !== 'string') {
    return `at ${currPath}, expecting type property to be a string, but was ${typeof type}`;
  }

  if (typeof isArray !== 'boolean') {
    return `at ${currPath}, expecting $isArray property to be a string, but was ${typeof isArray}`;
  }

  if (typeof description !== 'string') {
    return `at ${currPath}, expecting $description property to be a string, but was ${typeof description}`;
  }

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

      propMap[propKey] = propMappings;
    }
  }

  return {
    name,
    type,
    description,
    esParameters,
    isArray,
    properties: propMap,
  };
}
