/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';

/**
 * String schema that rejects Mustache template syntax.
 * Validation at Zod level ensures immediate feedback in Streamlang editors,
 * validation APIs, and prevents invalid DSL creation entirely.
 * Checks for `{{` anywhere in the string which makes Mustache active in Ingest Pipelines.
 */
const NoMustacheString = NonEmptyString.refine((val) => !val.includes('{{'), {
  message: 'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names',
});

/**
 * Smart validation that rejects Mustache templates only if the value is a string.
 * Non-string values (numbers, booleans, etc.) pass through since they can't contain templates.
 */
export const NoMustacheValue = z.unknown().refine(
  (val) => {
    if (typeof val === 'string') {
      return !val.includes('{{');
    }
    return true; // Non-strings are allowed
  },
  {
    message: 'Mustache template syntax {{ }} or {{{ }}} is not allowed in [value] field',
  }
);

/**
 * Array validation that rejects Mustache templates in any string elements.
 * Non-string array elements (numbers, booleans, etc.) pass through.
 */
export const NoMustacheArrayValues = z
  .array(z.unknown())
  .nonempty()
  .refine(
    (arr) => {
      return arr.every((val) => {
        if (typeof val === 'string') {
          return !val.includes('{{');
        }
        return true; // Non-strings are allowed
      });
    },
    {
      message: 'Mustache template syntax {{ }} or {{{ }}} is not allowed in array [value] elements',
    }
  );

/**
 * Source field names (from fields) - prevents Mustache templates in field references
 */
export const StreamlangSourceField = NoMustacheString;

/**
 * Target field names (to fields) - prevents Mustache templates in field creation
 */
export const StreamlangTargetField = NoMustacheString;

/**
 * Separator for join and split processors. Allows spaces and other characters.
 */
export const StreamlangSeparator = z.string().min(1);
