/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { savedObjectSchema } from '@kbn/content-management-utils/zod';

/**
 * Builds the Lens schema set for a given item version so callers can opt into
 * different version literals without duplicating schema definitions.
 */
export function createVersionedLensSchemas<Version extends number>(version: Version) {
  const lensItemAttributesSchema = z
    .object({
      title: z.string(),
      description: z.string().optional(),
      visualizationType: z.string(),
      state: z.any().optional(),
      // TODO make version required
      version: z.literal(version).optional(), // pin version explicitly
    })
    .strict();

  /**
   * The underlying SO type used to store Lens state in Content Management.
   *
   * Only used in lens server-side Content Management.
   */
  const lensSavedObjectSchema = savedObjectSchema(lensItemAttributesSchema);

  /**
   * The Lens item data returned from the server
   */
  const lensItemSchema = lensSavedObjectSchema
    .pick({
      id: true,
      references: true,
    })
    .extend(lensItemAttributesSchema.shape)
    .strict();

  /**
   * The common SO type used for mSearch items.
   */
  const lensCommonSavedObjectSchema = savedObjectSchema(
    z.object(lensItemAttributesSchema.pick({ title: true, description: true })).strict()
  );

  // TODO: cleanup data for update, should we forbid or just ignore body.id on update?
  const lensItemDataSchema = lensItemSchema.omit({ id: true });

  return {
    lensItemAttributesSchema,
    lensSavedObjectSchema,
    lensItemSchema,
    lensCommonSavedObjectSchema,
    lensItemDataSchema,
  } as const;
}
