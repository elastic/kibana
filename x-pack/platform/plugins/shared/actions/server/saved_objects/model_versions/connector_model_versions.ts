/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { rawConnectorSchemaV1, rawConnectorSchemaV2 } from '../schemas/raw_connector';

export const connectorModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      create: rawConnectorSchemaV1,
    },
  },
  '2': {
    changes: [
      {
        type: 'data_backfill',
        backfillFn: (document) => {
          return {
            attributes: {
              authMode: 'shared',
            },
          };
        },
      },
    ],
    schemas: {
      create: rawConnectorSchemaV2,
    },
  },
};
