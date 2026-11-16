/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import {
  MAX_OBSERVABLE_METADATA_ENTRIES,
  MAX_OBSERVABLE_METADATA_KEY_LENGTH,
  MAX_OBSERVABLE_METADATA_VALUE_LENGTH,
} from '../../../../common/constants';
import { attachmentCreateSchemaV1 } from './model_version_1';
import { attachmentDataSchemaV2 } from './model_version_2';

const observableMetadataSchema = schema.recordOf(
  schema.string({ minLength: 1, maxLength: MAX_OBSERVABLE_METADATA_KEY_LENGTH }),
  schema.string({ maxLength: MAX_OBSERVABLE_METADATA_VALUE_LENGTH }),
  {
    validate: (metadata) =>
      Object.keys(metadata).length > MAX_OBSERVABLE_METADATA_ENTRIES
        ? `must have at most ${MAX_OBSERVABLE_METADATA_ENTRIES} entries`
        : undefined,
  }
);

const attachmentDataSchemaV3 = attachmentDataSchemaV2.extends({
  metadata: schema.maybe(schema.nullable(observableMetadataSchema)),
});

/**
 * Indexes the editable key/value metadata of an `observable` attachment as one `flattened` field,
 * so any key is searchable without adding a mapping per key.
 */
export const modelVersion3: SavedObjectsFullModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        data: {
          properties: {
            metadata: { type: 'flattened', ignore_above: 1024 },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: (attrs) => attrs,
    create: attachmentCreateSchemaV1.extends({
      data: schema.maybe(schema.nullable(attachmentDataSchemaV3)),
    }),
  },
};
