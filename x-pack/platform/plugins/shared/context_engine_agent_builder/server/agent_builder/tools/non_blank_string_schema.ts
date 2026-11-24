/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonBlank } from '@kbn/context-engine-plugin/common/validation';
import { z } from '@kbn/zod/v4';

/** A string of 1 to `maxLength` characters that rejects whitespace-only values, as the session memory routes do. */
export const nonBlankStringSchema = (maxLength: number): z.ZodString =>
  z
    .string()
    .min(1)
    .max(maxLength)
    .superRefine((value, ctx) => {
      const validationError = validateNonBlank(value);
      if (validationError) {
        ctx.addIssue({ code: 'custom', message: validationError });
      }
    });
