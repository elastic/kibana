/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObject,
  SavedObjectAttributes,
  SavedObjectReference,
} from 'src/core/server/saved_objects';
import { SAVED_OBJECT_TYPE } from '../common/constants';
import { Request } from '../common/types';

type AssetReference = Pick<SavedObjectReference, 'id' | 'type'>;
export interface Installation extends SavedObjectAttributes {
  installed: AssetReference[];
}

export type InstallationSavedObject = SavedObject<Installation>;

export const getClient = (req: Request) => req.getSavedObjectsClient();

export const mappings = {
  [SAVED_OBJECT_TYPE]: {
    properties: {
      installed: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          type: { type: 'keyword' },
        },
      },
    },
  },
};

export const savedObjectSchemas = {
  [SAVED_OBJECT_TYPE]: {
    isNamespaceAgnostic: true,
  },
};
