/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import {
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
} from '../../../../common/constants';
import { attachmentCreateSchemaV1, attachmentDataSchemaV1 } from './model_version_1';

const observableKeyword = { type: 'keyword', ignore_above: 1024 } as const;

const attachmentDataSchemaV2 = attachmentDataSchemaV1.extends({
  typeKey: schema.maybe(schema.string({ maxLength: MAX_OBSERVABLE_TYPE_KEY_LENGTH })),
  value: schema.maybe(schema.string({ maxLength: MAX_OBSERVABLE_VALUE_LENGTH })),
  description: schema.maybe(
    schema.nullable(schema.string({ maxLength: MAX_OBSERVABLE_DESCRIPTION_LENGTH }))
  ),
  legacyId: schema.maybe(schema.string({ maxLength: MAX_ATTACHMENT_ID_LENGTH })),
});

/**
 * Indexes the `observable` attachment fields so observables can be paged, sorted and filtered.
 * `legacyId` keeps the id an observable had on the case before it was migrated to an attachment.
 */
export const modelVersion2: SavedObjectsFullModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        data: {
          properties: {
            typeKey: observableKeyword,
            value: observableKeyword,
            description: observableKeyword,
            legacyId: observableKeyword,
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: (attrs) => attrs,
    create: attachmentCreateSchemaV1.extends({
      data: schema.maybe(schema.nullable(attachmentDataSchemaV2)),
    }),
  },
};
