/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { arrayOfStringsSchema } from './common';

export const assetSchema = z.intersection(
  z.object({
    asset: z.object({
      id: z.string(),
      indexPattern: arrayOfStringsSchema,
      category: arrayOfStringsSchema,
      identityField: arrayOfStringsSchema,
      metric: z.record(z.string(), z.number()),
    }),
  }),
  z.record(z.string(), z.string().or(z.number()))
);
