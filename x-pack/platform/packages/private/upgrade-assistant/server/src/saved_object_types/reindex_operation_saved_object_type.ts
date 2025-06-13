/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const reindexOperationSavedObjectType: SavedObjectsType = {
  // todo does this need to be shared?
  name: 'upgrade-assistant-reindex-operation',
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      indexName: {
        type: 'keyword',
      },
      status: {
        type: 'integer',
      },
    },
  },
};
