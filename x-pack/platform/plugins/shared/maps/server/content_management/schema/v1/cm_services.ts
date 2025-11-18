/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';
import {
  savedObjectSchema,
  objectTypeToGetResultSchema,
  createResultSchema,
  referencesSchema,
} from '@kbn/content-management-utils';
import { mapAttributesSchema } from './map_attributes_schema/map_attributes_schema';

export const mapSavedObjectSchema = savedObjectSchema(mapAttributesSchema);

export const searchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

export const mapsSearchOptionsSchema = schema.maybe(
  schema.object(
    {
      onlyTitle: schema.maybe(schema.boolean()),
    },
    { unknowns: 'forbid' }
  )
);

export const mapsCreateOptionsSchema = schema.maybe(
  schema.object({
    references: schema.maybe(referencesSchema),
  })
);

export const mapsUpdateOptionsSchema = schema.maybe(
  schema.object({
    references: schema.maybe(referencesSchema),
  })
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
