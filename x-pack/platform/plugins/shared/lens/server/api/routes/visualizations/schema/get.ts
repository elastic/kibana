/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { lensResponseItemSchema } from './common';

export const lensGetRequestParamsSchema = z
  .object({
    id: z.string().meta({
      description: 'The visualization identifier, as returned by the create or search endpoints.',
    }),
  })
  .strict();

export const lensGetResponseBodySchema = lensResponseItemSchema;
