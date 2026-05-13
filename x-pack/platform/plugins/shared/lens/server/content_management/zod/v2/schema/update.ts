/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createResultSchema, updateOptionsSchema } from '@kbn/content-management-utils/zod';

import { lensItemAttributesSchemaV2, lensSavedObjectSchemaV2 } from './common';

export const lensCMUpdateOptionsSchema = updateOptionsSchema.pick({ references: true }).strict();

export const lensCMUpdateBodySchema = z
  .object({
    options: lensCMUpdateOptionsSchema,
    data: lensItemAttributesSchemaV2,
  })
  .strict();

export const lensCMUpdateResultSchema = createResultSchema(lensSavedObjectSchemaV2);
