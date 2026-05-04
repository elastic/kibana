/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { validateDuration, validateMaxDuration } from './validation';
import { MAX_DURATION } from './constants';

const durationSchema = z.string().superRefine((value, ctx) => {
  const formatError = validateDuration(value);
  if (formatError) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: formatError });
    return;
  }
  const maxError = validateMaxDuration(value, MAX_DURATION);
  if (maxError) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: maxError });
  }
});

export { durationSchema };
