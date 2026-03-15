/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { rawUiamApiKeysProvisioningStatusSchemaV1 } from '../schemas/raw_uiam_api_keys_provisioning_status';

export const uiamApiKeysProvisioningStatusModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      forwardCompatibility: rawUiamApiKeysProvisioningStatusSchemaV1.extends(
        {},
        { unknowns: 'ignore' }
      ),
      create: rawUiamApiKeysProvisioningStatusSchemaV1,
    },
  },
};
