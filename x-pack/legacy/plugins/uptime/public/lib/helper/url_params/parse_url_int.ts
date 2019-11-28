/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: add a comment explaining the purpose of this function
export const parseUrlInt = (value: string | undefined, defaultValue: number): number => {
  const parsed = parseInt(value || '', 10);
  return isNaN(parsed) ? defaultValue : parsed;
};
