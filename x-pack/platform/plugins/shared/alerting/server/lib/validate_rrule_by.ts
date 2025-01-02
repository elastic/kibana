/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createValidateRruleBy = (propName: string) => (array: unknown[]) => {
  if (array.length === 0) return `rRule ${propName} cannot be empty`;
  return;
};
