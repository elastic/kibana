/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface FilterField {
  name: string;
  fieldName: string;
}

interface FilterSlices {
  [key: string]: any;
}

export const parseFiltersMap = (filterMapString: string, fields: FilterField[]): FilterSlices => {
  const filterSlices: FilterSlices = {};
  try {
    const map = new Map<string, string[]>(JSON.parse(filterMapString));
    fields.forEach(({ name, fieldName }) => {
      filterSlices[name] = map.get(fieldName) ?? [];
    });
    return filterSlices;
  } catch (e) {
    return {};
  }
};
