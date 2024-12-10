/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const rulesSettingsMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    flapping: {
      properties: {
        // NO NEED TO BE INDEXED
        // enabled: {
        //   type: 'boolean',
        //   index: false,
        // },
        // lookBackWindow: {
        //   type: 'long',
        //   index: false,
        // },
        // statusChangeThreshold: {
        //   type: 'long',
        //   index: false,
        // },
        // createdBy: {
        //   type: 'keyword',
        //   index: false,
        // },
        // updatedBy: {
        //   type: 'keyword',
        //   index: false,
        // },
        // createdAt: {
        //   type: 'date',
        //   index: false,
        // },
        // updatedAt: {
        //   type: 'date',
        //   index: false,
        // },
      },
    },
  },
};
