/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  rawAdHocRunParamsSchemaV1,
  rawAdHocRunParamsSchemaV2,
  rawAdHocRunParamsSchemaV3,
  rawAdHocRunParamsSchemaV4,
  rawAdHocRunParamsSchemaV5,
  rawAdHocRunParamsSchemaV6,
} from '../schemas/raw_ad_hoc_run_params';
import { backfillInitiator } from '../../../common/constants';

export const adHocRunParamsModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawAdHocRunParamsSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawAdHocRunParamsSchemaV1,
    },
  },
  '2': {
    changes: [],
    schemas: {
      forwardCompatibility: rawAdHocRunParamsSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawAdHocRunParamsSchemaV2,
    },
  },
  '3': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          initiator: { type: 'keyword' },
          initiatorId: { type: 'keyword' },
        },
      },
      {
        type: 'data_backfill',
        backfillFn: () => {
          return { attributes: { initiator: backfillInitiator.USER } };
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawAdHocRunParamsSchemaV3.extends({}, { unknowns: 'ignore' }),
      create: rawAdHocRunParamsSchemaV3,
    },
  },
  '4': {
    // `uiamApiKey` is an encrypted attribute, so it is not mapped/searchable and
    // requires no `mappings_addition`. Existing saved objects without the field
    // remain valid because it is optional.
    changes: [],
    schemas: {
      forwardCompatibility: rawAdHocRunParamsSchemaV4.extends({}, { unknowns: 'ignore' }),
      create: rawAdHocRunParamsSchemaV4,
    },
  },
  '5': {
    // `uiamApiKeyExternal` is only read when building the backfill run's fake request, so it needs
    // no `mappings_addition`. Existing saved objects without the field remain valid because it is
    // optional, and its absence means internal-key treatment (fail closed).
    changes: [],
    schemas: {
      forwardCompatibility: rawAdHocRunParamsSchemaV5.extends({}, { unknowns: 'ignore' }),
      create: rawAdHocRunParamsSchemaV5,
    },
  },
  '6': {
    changes: [
      {
        // Unlike `uiamApiKey`, the id is stored unencrypted and has to be searchable so the API
        // key invalidation task's in-use guard can find ad hoc runs still holding the key.
        type: 'mappings_addition',
        addedMappings: {
          uiamApiKeyId: { type: 'keyword', ignore_above: 1024 },
        },
      },
    ],
    schemas: {
      forwardCompatibility: rawAdHocRunParamsSchemaV6.extends({}, { unknowns: 'ignore' }),
      create: rawAdHocRunParamsSchemaV6,
    },
  },
};
