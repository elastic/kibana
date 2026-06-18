/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { savedObjectSchema } from '@kbn/content-management-utils/zod';

/**
 * Pre-existing Lens SO attributes (aka `v0`).
 *
 * We could still require handling see these attributes and should allow
 * saving them as is with unknown version. The CM will eventually apply the transforms.
 *
 * @deprecated - use `v1` schemas
 */
export const lensItemAttributesSchemaV0 = z
  .object({
    title: z.string(),
    description: z.string().nullable().optional(),
    visualizationType: z.string().nullable().optional(),
    state: z.unknown().optional(),
    uiStateJSON: z.string().optional(),
    visState: z.string().optional(),
    savedSearchRefName: z.string().optional(),
  })
  .loose();

/**
 * The underlying SO type used to store Lens state in Content Management.
 *
 * Only used in lens server-side Content Management.
 *
 * @deprecated - use `v1` schemas
 */
export const lensSavedObjectSchemaV0 = savedObjectSchema(lensItemAttributesSchemaV0);

/**
 * The Lens item data returned from the server
 *
 * @deprecated - use `v1` schemas
 */
export const lensItemSchemaV0 = lensSavedObjectSchemaV0
  .pick({
    id: true,
    references: true,
  })
  .extend(lensItemAttributesSchemaV0.shape)
  .strict();

export const lensItemDataSchemaV0 = lensItemSchemaV0.omit({ id: true });
