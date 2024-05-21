/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { arrayOfStringsSchema } from './common';

export const entitySchema = z.intersection(
  z.object({
    entity: z.object({
      id: z.string(),
      indexPatterns: arrayOfStringsSchema,
      identityFields: arrayOfStringsSchema,
      metric: z.record(z.string(), z.number()),
      spaceId: z.string(),
    }),
  }),
  z.record(z.string(), z.string().or(z.number()))
);
