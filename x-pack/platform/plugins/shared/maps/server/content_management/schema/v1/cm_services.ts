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
  createOptionsSchemas,
  createResultSchema,
  updateOptionsSchema,
} from '@kbn/content-management-utils';

export const mapAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.nullable(schema.string())),
    mapStateJSON: schema.maybe(schema.string()),
    layerListJSON: schema.maybe(schema.string()),
    uiStateJSON: schema.maybe(schema.string()),
  },
  { unknowns: 'forbid' }
);

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

export const createOptionsSchema = schema.object({
  references: schema.maybe(createOptionsSchemas.references),
});

export const mapsCreateOptionsSchema = schema.object({
  references: schema.maybe(createOptionsSchemas.references),
});

export const mapsUpdateOptionsSchema = schema.object({
  references: updateOptionsSchema.references,
});

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
        schema: createOptionsSchema,
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
        schema: mapsUpdateOptionsSchema, // Is still the same as create?
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
