/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { savedObjectSchema } from '@kbn/content-management-utils';

import { pickFromObjectSchema } from '../../utils';

/**
 * Builds the Lens schema set for a given item version so callers can opt into
 * different version literals without duplicating schema definitions.
 */
export function createVersionedLensSchemas<Version extends number>(version: Version) {
  const lensItemAttributesSchema = schema.object(
    {
      title: schema.string(),
      description: schema.maybe(schema.string()),
      visualizationType: schema.string(),
      state: schema.maybe(schema.any()),
      // TODO make version required
      version: schema.maybe(schema.literal(version)), // pin version explicitly
    },
    { unknowns: 'forbid' }
  );

  /**
   * The underlying SO type used to store Lens state in Content Management.
   *
   * Only used in lens server-side Content Management.
   */
  const lensSavedObjectSchema = savedObjectSchema(lensItemAttributesSchema);

  /**
   * The Lens item data returned from the server
   */
  const lensItemSchema = schema.object(
    {
      ...pickFromObjectSchema(lensSavedObjectSchema.getPropSchemas(), ['id', 'references']),
      ...lensSavedObjectSchema.getPropSchemas().attributes.getPropSchemas(),
    },
    { unknowns: 'forbid' }
  );

  /**
   * The common SO type used for mSearch items.
   */
  const lensCommonSavedObjectSchema = savedObjectSchema(
    schema.object(
      {
        ...pickFromObjectSchema(lensItemAttributesSchema.getPropSchemas(), [
          'title',
          'description',
        ]),
      },
      { unknowns: 'forbid' }
    )
  );

  // TODO: cleanup data for update, should we forbid or just ignore body.id on update?
  const lensItemDataSchema = lensItemSchema.extends({
    id: undefined,
  });

  return {
    lensItemAttributesSchema,
    lensSavedObjectSchema,
    lensItemSchema,
    lensCommonSavedObjectSchema,
    lensItemDataSchema,
  } as const;
}
