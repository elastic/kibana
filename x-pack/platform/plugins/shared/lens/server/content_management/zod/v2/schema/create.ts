/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createOptionsSchema, createResultSchema } from '@kbn/content-management-utils/zod';

import { lensItemAttributesSchemaV0 } from '../../v0';
import { lensItemAttributesSchemaV1 } from '../../v1';
import { lensItemAttributesSchemaV2, lensSavedObjectSchemaV2 } from './common';

export const lensCMCreateOptionsSchema = createOptionsSchema
  .pick({
    id: true,
    overwrite: true,
    references: true,
  })
  .strict();

export const lensCMCreateBodySchema = z
  .object({
    options: lensCMCreateOptionsSchema,
    data: z.union([
      lensItemAttributesSchemaV0, // Temporarily permit passing old v0 SO attributes on create
      lensItemAttributesSchemaV1, // Temporarily permit passing old v1 SO attributes on create
      lensItemAttributesSchemaV2,
    ]),
  })
  .strict();

export const lensCMCreateResultSchema = createResultSchema(lensSavedObjectSchemaV2);
