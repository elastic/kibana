/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  savedObjectSchema,
  objectTypeToGetResultSchema,
  createResultSchema,
  referencesSchema,
} from '@kbn/content-management-utils/zod';
import { mapAttributesSchema as lazyMapAttributesSchema } from './map_attributes_schema/map_attributes_schema';

/**
 * A `lazySchema` proxy only weakly references the schema it builds, so the GC can reclaim it and
 * the next access rebuilds it. Every content management request validates against the schemas
 * below, so hold a strong reference to a clone of each one used by `serviceDefinition`. The
 * clone's children are then retained as well, which avoids rebuilding the tree after a GC.
 */
const retainSchema = <T extends z.ZodType>(schema: T): T => schema.clone();

const mapAttributesSchema = retainSchema(lazyMapAttributesSchema);

export const mapSavedObjectSchema = savedObjectSchema(mapAttributesSchema);

export const searchOptionsSchema = lazySchema(() =>
  z
    .object({
      onlyTitle: z.boolean().optional(),
    })
    .strict()
    .optional()
);

export const mapsSearchOptionsSchema = lazySchema(() =>
  z
    .object({
      onlyTitle: z.boolean().optional(),
    })
    .strict()
    .optional()
);

export const mapsCreateOptionsSchema = lazySchema(() =>
  z
    .object({
      references: referencesSchema.optional(),
    })
    .strict()
    .optional()
);

export const mapsUpdateOptionsSchema = lazySchema(() =>
  z
    .object({
      references: referencesSchema.optional(),
    })
    .strict()
    .optional()
);

export const mapsGetResultSchema = objectTypeToGetResultSchema(mapSavedObjectSchema);

export const mapsCreateResultSchema = createResultSchema(mapSavedObjectSchema);

// Content management service definition.
// We need it for BWC support between different versions of the content
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: objectTypeToGetResultSchema(mapSavedObjectSchema),
      },
    },
  },
  create: {
    in: {
      options: {
        schema: retainSchema(mapsCreateOptionsSchema),
      },
      data: {
        schema: mapAttributesSchema,
      },
    },
    out: {
      result: {
        schema: mapsCreateResultSchema,
      },
    },
  },
  update: {
    in: {
      options: {
        schema: retainSchema(mapsUpdateOptionsSchema),
      },
      data: {
        schema: mapAttributesSchema,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: retainSchema(searchOptionsSchema),
      },
    },
  },
  mSearch: {
    out: {
      result: {
        schema: mapSavedObjectSchema,
      },
    },
  },
};
