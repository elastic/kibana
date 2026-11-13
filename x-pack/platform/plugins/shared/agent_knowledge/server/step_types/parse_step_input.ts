/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

export const parseStepInput = <T extends z.ZodType>(
  schema: T,
  input: unknown
): z.infer<T> => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Invalid step input: ${parsed.error.message}`);
  }
  return parsed.data;
};
