/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { lensApiConfigSchema } from '@kbn/lens-embeddable-utils';

import {
  lensCMUpdateOptionsSchema,
  lensItemDataSchemaV2,
} from '../../../../../content_management/zod';
import { lensItemDataSchemaV0 } from '../../../../../content_management/zod/v0';
import { lensItemDataSchemaV1 } from '../../../../../content_management/zod/v1';
import { lensResponseItemSchema } from './common';

export const lensUpdateRequestParamsSchema = z
  .object({
    id: z.string().meta({
      description: 'The saved object id of a Lens visualization.',
    }),
  })
  .strict();

export const lensUpdateRequestQuerySchema = lensCMUpdateOptionsSchema
  .omit({ references: true })
  .strict();

export const lensUpdateRequestBodySchema = z.union([
  lensApiConfigSchema,
  lensItemDataSchemaV2,
  lensItemDataSchemaV1,
  lensItemDataSchemaV0, // Temporarily permit passing old v0 SO attributes on create
]);

export const lensUpdateResponseBodySchema = lensResponseItemSchema;
