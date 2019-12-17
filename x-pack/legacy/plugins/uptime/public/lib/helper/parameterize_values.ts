/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const getParameterForList = (key: string, list: string[]) =>
  list.map(value => `&${key}=${value}`).reduce((prev: string, cur: string) => prev + cur, '');

export const parameterizeValues = (obj: Record<string, string[]>) =>
  Object.keys(obj)
    .map(key => getParameterForList(key, obj[key]))
    .reduce((acc, cur) => acc + cur, '');
