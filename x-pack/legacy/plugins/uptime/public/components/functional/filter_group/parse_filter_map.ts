/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface FilterField {
  name: string;
  fieldName: string;
}

/**
 * These are the only filter fields we are looking to catch at the moment.
 * If your code needs to support custom fields, introduce a second parameter to
 * `parseFiltersMap` to take a list of FilterField objects.
 */
const filterWhitelist: FilterField[] = [
  { name: 'ports', fieldName: 'url.port' },
  { name: 'locations', fieldName: 'observer.geo.name' },
  { name: 'tags', fieldName: 'tags' },
  { name: 'schemes', fieldName: 'monitor.type' },
];

export const parseFiltersMap = (filterMapString: string) => {
  if (!filterMapString) {
    return {};
  }
  const filterSlices: { [key: string]: any } = {};
  try {
    const map = new Map<string, string[]>(JSON.parse(filterMapString));
    filterWhitelist.forEach(({ name, fieldName }) => {
      filterSlices[name] = map.get(fieldName) ?? [];
    });
    return filterSlices;
  } catch {
    throw new Error('Unable to parse invalid filter string');
  }
};
