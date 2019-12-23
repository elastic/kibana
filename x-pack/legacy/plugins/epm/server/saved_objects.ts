/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SAVED_OBJECT_TYPE_PACKAGES } from '../common/constants';
import { Request } from './types';

export const getClient = (req: Request) => req.getSavedObjectsClient();

export const mappings = {
  [SAVED_OBJECT_TYPE_PACKAGES]: {
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
  [SAVED_OBJECT_TYPE_PACKAGES]: {
    isNamespaceAgnostic: true,
  },
};
