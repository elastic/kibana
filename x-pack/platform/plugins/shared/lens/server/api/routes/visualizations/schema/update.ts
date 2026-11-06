/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { lensResponseItemSchema, lensApiConfigLibItemSchemaNoESQL } from './common';

export const lensUpdateRequestParamsSchema = z
  .object({
    id: z.string().meta({
      description: 'The visualization identifier, as returned by the create or search endpoints.',
    }),
  })
  .strict();

export const lensUpdateRequestBodySchema = lensApiConfigLibItemSchemaNoESQL;

export const lensUpdateResponseBodySchema = lensResponseItemSchema;
