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
import { mapAttributesSchema } from './map_attributes_schema/map_attributes_schema';

export const mapSavedObjectSchema = lazySchema(() => savedObjectSchema(mapAttributesSchema));

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

export const mapsGetResultSchema = lazySchema(() =>
  objectTypeToGetResultSchema(mapSavedObjectSchema)
);

export const mapsCreateResultSchema = lazySchema(() => createResultSchema(mapSavedObjectSchema));

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
        schema: mapsCreateOptionsSchema,
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
        schema: mapsUpdateOptionsSchema,
      },
      data: {
        schema: mapAttributesSchema,
      },
    },
  },
  search: {
    in: {
      options: {
        schema: searchOptionsSchema,
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
