/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This is similar to lodash's get() except that it's TypeScript aware and is able to infer return types.
// It splits the attribute key string and uses reduce with an idx check to access nested attributes.
export function getNestedProperty(
  obj: Record<string, any>,
  accessor: string,
  defaultValue?: any
): any {
  const accessorKeys = accessor.split('.');

  let o = obj;
  for (let i = 0; i < accessorKeys.length; i++) {
    const keyPart = accessorKeys[i];
    o = o?.[keyPart];
    if (Array.isArray(o)) {
      o = o.map((v) =>
        typeof v === 'object'
          ? // from this point we need to resolve path for each element in the collection
            getNestedProperty(v, accessorKeys.slice(i + 1, accessorKeys.length).join('.'))
          : v
      );
      break;
    }
  }

  if (o === undefined) return defaultValue;

  return o;
}
