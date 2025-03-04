/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const mappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    taskPool: {
      type: 'keyword',
    },
    workerState: {
      type: 'flattened',
    },
    // workerState: {
    //   properties: {
    //     workerId: {
    //       type: 'keyword',
    //     },
    //     state: {
    //       properties: {
    //         result: {
    //           type: 'flattened',
    //         },
    //         status: {
    //           type: 'keyword',
    //         }
    //       }
    //     }
    //   }
    // },
    orchestratorTaskId: {
      type: 'keyword',
    },
    workerQueue: {
      type: 'keyword',
    },
    maxWorkers: {
      type: 'integer',
    },
    status: {
      type: 'keyword',
    },
    // result: {
    //   type: 'flattened'
    // },
  },
};
