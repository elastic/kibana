/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import {
  MAX_TEMPLATE_KEY_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TAGS_PER_TEMPLATE,
  MAX_TEMPLATE_TAG_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_FIELD_DEFINITIONS_PER_OWNER,
} from '../../../../common/constants';

export const templateSchemaV2 = schema.object({
  templateId: schema.string({ maxLength: MAX_TEMPLATE_KEY_LENGTH }),
  name: schema.string({ maxLength: MAX_TEMPLATE_NAME_LENGTH }),
  owner: schema.string({ maxLength: 30 }),
  definition: schema.string({ maxLength: MAX_DESCRIPTION_LENGTH }),
  templateVersion: schema.number(),
  deletedAt: schema.nullable(schema.string({ maxLength: 30 })),
  description: schema.maybe(schema.string({ maxLength: MAX_TEMPLATE_DESCRIPTION_LENGTH })),
  tags: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: MAX_TEMPLATE_TAG_LENGTH }), {
      maxSize: MAX_TAGS_PER_TEMPLATE,
    })
  ),
  author: schema.maybe(schema.string({ maxLength: MAX_TITLE_LENGTH })),
  usageCount: schema.maybe(schema.number()),
  fieldCount: schema.maybe(schema.number()),
  fieldDefinitions: schema.maybe(
    schema.arrayOf(
      schema.object({
        name: schema.string({ maxLength: MAX_TITLE_LENGTH }),
        label: schema.string({ maxLength: MAX_TITLE_LENGTH }),
        type: schema.string({ maxLength: 50 }),
        control: schema.string({ maxLength: 50 }),
      }),
      { maxSize: MAX_FIELD_DEFINITIONS_PER_OWNER }
    )
  ),
  lastUsedAt: schema.maybe(schema.string({ maxLength: 30 })),
  isDefault: schema.maybe(schema.boolean()),
  isLatest: schema.maybe(schema.boolean()),
  isEnabled: schema.maybe(schema.boolean()),
});

export const modelVersion2: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        fieldDefinitions: {
          type: 'nested',
          properties: {
            name: { type: 'keyword', ignore_above: 1024 },
            label: { type: 'text' },
            type: { type: 'keyword', ignore_above: 1024 },
            control: { type: 'keyword', ignore_above: 1024 },
          },
        },
      },
    },
    {
      type: 'mappings_deprecation',
      deprecatedMappings: ['fieldNames'],
    },
    {
      type: 'data_backfill',
      backfillFn: (doc) => {
        const attrs = doc.attributes as Record<string, unknown>;
        // fieldNames may hold string arrays (9.4 keyword storage) or object arrays
        // (written by 9.5 BC2 before this fix) — copy whatever is present
        if (attrs.fieldNames != null && attrs.fieldDefinitions == null) {
          return {
            attributes: {
              fieldDefinitions: attrs.fieldNames,
              fieldNames: undefined,
            },
          };
        }
        return { attributes: {} };
      },
    },
  ],
  schemas: {
    create: templateSchemaV2,
    forwardCompatibility: templateSchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};
