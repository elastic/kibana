/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import { LEDGER_SAVED_OBJECT_TYPE } from '../../common';

/** The longest id the ledger records; the registry rejects longer ids of owned kinds. */
export const MAX_OWNED_ID_LENGTH = 1000;

/** The longest kind id the ledger records; the registry rejects longer kind ids. */
export const MAX_KIND_ID_LENGTH = 100;

const ledgerEntryAttributesSchema = schema.object({
  kind: schema.string({ maxLength: MAX_KIND_ID_LENGTH }),
  resourceId: schema.string({ maxLength: MAX_OWNED_ID_LENGTH }),
  spaces: schema.arrayOf(schema.string({ maxLength: 250 }), { maxSize: 100 }),
  appliedHash: schema.maybe(schema.string({ maxLength: 64 })),
  objectVersion: schema.maybe(schema.string({ maxLength: 100 })),
  objectUpdatedAt: schema.maybe(schema.string({ maxLength: 100 })),
  kibanaVersion: schema.maybe(schema.string({ maxLength: 100 })),
});

/**
 * One document per object the bootstrap owns, under an id derived from the kind and the declared
 * id; always read in full, so nothing is indexed.
 */
export const ledgerSavedObjectType: SavedObjectsType = {
  name: LEDGER_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: ledgerEntryAttributesSchema.extends({}, { unknowns: 'ignore' }),
        create: ledgerEntryAttributesSchema,
      },
    },
  },
};
