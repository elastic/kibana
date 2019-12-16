/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const parameterizeValues = (key: string, list: string[]) =>
  list.map(value => `&${key}=${value}`).reduce((prev: string, cur: string) => prev + cur, '');
