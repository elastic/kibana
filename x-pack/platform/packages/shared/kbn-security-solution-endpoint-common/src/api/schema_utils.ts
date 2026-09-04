/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validates that a string is not empty by first `.trim()`'ing it and then checking the length.
 *
 * A package-local copy of the identical helper in
 * security_solution/common/api/endpoint/schema_utils.ts. That module's other consumers are
 * all in `scripts_library`, which is not moving here, so the two are kept independent.
 * @param value
 */
export const validateNonEmptyString = (value: string): void | string => {
  if (!value.trim().length) {
    return `Value can not be an empty string`;
  }
};
