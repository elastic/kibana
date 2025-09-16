/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

function defaultFilterFn(value: string, query: string) {
  if (value.toLowerCase().includes(query.toLowerCase())) {
    return true;
  }
  return false;
}

export function filter<T>(
  data: T[],
  queryText: string,
  fields: string[],
  filterFn = defaultFilterFn
): T[] {
  return data.filter((item) => {
    for (const field of fields) {
      // @ts-expect-error upgrade typescript v5.4.5
      if (filterFn(get(item, field, ''), queryText)) {
        return true;
      }
    }
  });
}
