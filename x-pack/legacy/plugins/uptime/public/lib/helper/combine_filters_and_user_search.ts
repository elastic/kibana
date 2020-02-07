/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const combineFiltersAndUserSearch = (filters: string, search: string) => {
  if (!filters && !search) {
    return '';
  }
  if (!filters) return search;
  if (!search) return filters;
  return `(${filters}) and (${search})`;
};
