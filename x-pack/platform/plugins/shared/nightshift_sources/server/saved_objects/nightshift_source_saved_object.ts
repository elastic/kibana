/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type TypeOf } from '@kbn/config-schema';
import {
  MAX_SOURCE_SLUG_LENGTH,
  MAX_SOURCE_TAG_LENGTH,
  MAX_SOURCE_TAGS,
} from '@kbn/nightshift-shared';

export const NIGHTSHIFT_SOURCE_SO_TYPE = 'nightshift-source';

const nightshiftSourceAttributesSchemaV1 = schema.object({
  title: schema.string(),
  description: schema.maybe(schema.string()),
  tags: schema.arrayOf(schema.string({ maxLength: MAX_SOURCE_TAG_LENGTH }), {
    maxSize: MAX_SOURCE_TAGS,
  }),
  esql: schema.string(),
  slug: schema.string({ maxLength: MAX_SOURCE_SLUG_LENGTH }),
  view_name: schema.string(),
  enabled: schema.boolean(),
  created_by: schema.string(),
  created_at: schema.string(),
  updated_at: schema.string(),
  // Moves only when the normalized ES|QL changes, so engines can tell a query edit from a
  // title edit without diffing the query themselves.
  esql_updated_at: schema.string(),
});

export type NightshiftSourceAttributes = TypeOf<typeof nightshiftSourceAttributesSchemaV1>;

/**
 * Hidden and not on the Nightshift feature's `savedObject` lists: access goes through the
 * `/internal/nightshift/sources` route authz and a scoped client that includes this hidden
 * type and skips the saved objects security extension.
 */
export const nightshiftSourceSavedObjectType: SavedObjectsType<NightshiftSourceAttributes> = {
  name: NIGHTSHIFT_SOURCE_SO_TYPE,
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      // keyword rather than text: the list endpoint sorts on it.
      title: { type: 'keyword', ignore_above: 1024 },
      enabled: { type: 'boolean' },
      // Create looks this up across every space so two "Nginx errors" sources do not share a view.
      view_name: { type: 'keyword' },
      // tags and slug stay in `_source`; list only filters/sorts title and enabled.
    },
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: nightshiftSourceAttributesSchemaV1,
        forwardCompatibility: nightshiftSourceAttributesSchemaV1.extends(
          {},
          { unknowns: 'ignore' }
        ),
      },
    },
  },
};
