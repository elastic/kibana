/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const validateInteger = (value: number, fieldName: string) => {
  if (!Number.isInteger(value)) {
    return `schedule ${fieldName} must be a positive integer.`;
  }
};
