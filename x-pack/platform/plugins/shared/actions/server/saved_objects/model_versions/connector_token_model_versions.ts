/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import {
  rawConnectorTokenSchemaV1,
  rawConnectorTokenSchemaV2,
} from '../schemas/raw_connector_token';

export const connectorTokenModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawConnectorTokenSchemaV1.extends({}, { unknowns: 'ignore' }),
      create: rawConnectorTokenSchemaV1,
    },
  },
  '2': {
    changes: [], // backwards-compatible schema evolution
    schemas: {
      forwardCompatibility: rawConnectorTokenSchemaV2.extends({}, { unknowns: 'ignore' }),
      create: rawConnectorTokenSchemaV2,
    },
  },
};
