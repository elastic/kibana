/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { MAX_TITLE_LENGTH, MAX_FIELD_DEFINITIONS_PER_OWNER } from '../../../../common/constants';
import { templateSchema } from './model_version_1';

// Derived from the v1 schema: drops the deprecated `fieldNames` and adds `fieldDefinitions`
// (backfilled from `fieldNames` below).
export const templateSchemaV2 = templateSchema.extends({
  fieldNames: undefined,
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

        // Nothing to migrate when the legacy field is absent or the new field is already populated.
        if (attrs.fieldNames == null || attrs.fieldDefinitions != null) {
          return { attributes: {} };
        }

        // Normalize the two legacy shapes into objects: 9.4 stored plain keyword strings, 9.5 BC2
        // stored full objects. Strings only carried the name; `type`/`control` are repopulated on
        // the next template write.
        const legacy = Array.isArray(attrs.fieldNames)
          ? (attrs.fieldNames as Array<string | Record<string, unknown>>)
          : [];

        const fieldDefinitions = legacy.map((field) => {
          if (typeof field === 'string') {
            return { name: field, label: field, type: '', control: '' };
          }
          // Coerce malformed objects (missing name/label) so a one-shot migration can't leave
          // values that crash downstream readers (e.g. `field.label.toLowerCase()`).
          if (typeof field.name !== 'string' || typeof field.label !== 'string') {
            return {
              name: String(field.name ?? ''),
              label: String(field.label ?? ''),
              type: typeof field.type === 'string' ? field.type : '',
              control: typeof field.control === 'string' ? field.control : '',
            };
          }
          return field;
        });

        // `fieldNames` is intentionally left untouched: `data_backfill` merges via lodash and drops
        // `undefined`, so it cannot remove the attribute. The mapping is deprecated instead; the
        // stale value is harmless and would be purged by a future `data_removal`.
        return {
          attributes: {
            fieldDefinitions,
          },
        };
      },
    },
  ],
  schemas: {
    create: templateSchemaV2,
    forwardCompatibility: templateSchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};
