/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const setNestedProperty = (obj: Record<string, any>, accessor: string, value: any) => {
  let ref = obj;
  const accessors = accessor.split('.');
  const len = accessors.length;
  for (let i = 0; i < len - 1; i++) {
    const attribute = accessors[i];
    if (typeof ref[attribute] !== 'object') {
      ref[attribute] = {};
    }

    ref = ref[attribute];
  }

  ref[accessors[len - 1]] = value;

  return obj;
};
