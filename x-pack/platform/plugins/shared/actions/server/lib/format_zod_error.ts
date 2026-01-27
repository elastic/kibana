/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodError } from '@kbn/zod';
import { get } from 'lodash';

const MAX_ERRORS = 5;
const MAX_RECURSION = 20;

export function formatZodError(err: ZodError) {
  const formatted = err.format();
  const errorMessages: string[] = [...formatted._errors];

  getErrors(formatted, errorMessages);

  const totalErrors = errorMessages.length;

  const extraErrorCount = errorMessages.length - MAX_ERRORS;
  if (extraErrorCount > 0) {
    errorMessages.splice(MAX_ERRORS);
    errorMessages.push(`and ${extraErrorCount} more`);
  }

  if (totalErrors === 1) {
    return errorMessages.join('; ');
  }

  return `${totalErrors} errors:\n ${errorMessages
    .map((msg, index) => `[${index + 1}]: ${msg}`)
    .join(';\n ')}`;
}

function getErrors(
  formatted: ReturnType<ZodError['format']>,
  errorMessages: string[],
  prefix: string = '',
  level: number = 0
) {
  Object.keys(formatted).forEach((field) => {
    if (field === '_errors') {
      return;
    }

    const fieldErrors = get(formatted, `${field}._errors`, []);
    const newPrefix = prefix.length > 0 ? `${prefix}.${field}` : `${field}`;

    if (level >= MAX_RECURSION) {
      errorMessages.push(
        `Field "${newPrefix}...": Unable to parse ZodError - too many levels deep`
      );
      return;
    }

    if (fieldErrors.length === 0) {
      getErrors(
        get(formatted, field) as ReturnType<ZodError['format']>,
        errorMessages,
        newPrefix,
        level + 1
      );
    } else {
      errorMessages.push(`Field "${newPrefix}": ${fieldErrors.join(', ')}`);
    }
  });
}
