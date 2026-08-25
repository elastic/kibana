/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';
import { createResultSchema, updateOptionsSchema } from '@kbn/content-management-utils/zod';

import { lensItemAttributesSchemaV2, lensSavedObjectSchemaV2 } from './common';

export const lensCMUpdateOptionsSchema = lazySchema(() =>
  updateOptionsSchema.pick({ references: true }).strict()
);

export const lensCMUpdateBodySchema = lazySchema(() =>
  z
    .object({
      options: lensCMUpdateOptionsSchema,
      data: lensItemAttributesSchemaV2,
    })
    .strict()
);

export const lensCMUpdateResultSchema = lazySchema(() =>
  createResultSchema(lensSavedObjectSchemaV2)
);
