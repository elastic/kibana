/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALLOWED_DATA_UNITS } from '@kbn/ml-validators';

import type { ValidationResults } from './validation_results';

export function validateModelMemoryLimitUnits(
  modelMemoryLimit: string | undefined
): ValidationResults {
  const messages: ValidationResults['messages'] = [];
  let valid = true;

  if (modelMemoryLimit !== undefined) {
    const mml = String(modelMemoryLimit).toUpperCase();
    const mmlSplit = mml.match(/\d+(\w+)$/);
    const unit = mmlSplit && mmlSplit.length === 2 ? mmlSplit[1] : null;

    if (unit === null || ALLOWED_DATA_UNITS.indexOf(unit) === -1) {
      messages.push({ id: 'model_memory_limit_units_invalid' });
      valid = false;
    } else {
      messages.push({ id: 'model_memory_limit_units_valid' });
    }
  }

  return {
    valid,
    messages,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}
