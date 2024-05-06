/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { set } from '@kbn/safer-lodash-set';
import { unflatten } from 'flat';
import type { JSONSchema } from 'json-schema-to-ts';
import { forEach, get, isPlainObject } from 'lodash';
import { jsonSchemaToFlatParameters } from './json_schema_to_flat_parameters';

// JS to XML is "lossy", e.g. everything becomes an array and a string,
// so we need a JSON schema to deserialize it

export function convertDeserializedXmlWithJsonSchema(
  parameterResults: Array<Record<string, string[]>>,
  schema: JSONSchema
): Record<string, any> {
  const parameters = jsonSchemaToFlatParameters(schema);

  const result: Record<string, any> = Object.fromEntries(
    parameterResults.flatMap((parameterResult) => {
      return Object.keys(parameterResult).map((name) => {
        return [name, parameterResult[name]];
      });
    })
  );

  parameters.forEach((param) => {
    const key = param.name;
    let value: any[] = result[key] ?? [];
    value = param.array
      ? String(value)
          .split(',')
          .map((val) => val.trim())
      : value;

    switch (param.type) {
      case 'number':
        value = value.map((val) => Number(val));
        break;

      case 'integer':
        value = value.map((val) => Math.floor(Number(val)));
        break;

      case 'boolean':
        value = value.map((val) => String(val).toLowerCase() === 'true' || val === '1');
        break;
    }

    result[key] = param.array ? value : value[0];
  });

  function getArrayPaths(subSchema: JSONSchema, path: string = ''): string[] {
    if (typeof subSchema === 'boolean') {
      return [];
    }

    if (subSchema.type === 'object') {
      return Object.keys(subSchema.properties!).flatMap((key) => {
        return getArrayPaths(subSchema.properties![key], path ? path + '.' + key : key);
      });
    }

    if (subSchema.type === 'array') {
      return [path, ...getArrayPaths(subSchema.items as JSONSchema, path)];
    }

    return [];
  }

  const arrayPaths = getArrayPaths(schema);

  const unflattened: Record<string, any> = unflatten(result);

  arrayPaths.forEach((arrayPath) => {
    const target: any[] = [];
    function walk(value: any, path: string) {
      if (Array.isArray(value)) {
        value.forEach((val, index) => {
          if (!target[index]) {
            target[index] = {};
          }
          if (path) {
            set(target[index], path, val);
          } else {
            target[index] = val;
          }
        });
      } else if (isPlainObject(value)) {
        forEach(value, (val, key) => {
          walk(val, path ? path + '.' + key : key);
        });
      }
    }
    const val = get(unflattened, arrayPath);

    walk(val, '');

    set(unflattened, arrayPath, target);
  });

  return unflattened;
}
