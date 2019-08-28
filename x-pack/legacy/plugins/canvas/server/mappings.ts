/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore converting /libs/constants to TS breaks CI
import { CANVAS_TYPE, CUSTOM_ELEMENT_TYPE } from '../common/lib/constants';

export const mappings = {
  [CANVAS_TYPE]: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      '@timestamp': { type: 'date' },
      '@created': { type: 'date' },
    },
  },
  [CUSTOM_ELEMENT_TYPE]: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      help: { type: 'text' },
      content: { type: 'text' },
      image: { type: 'text' },
      '@timestamp': { type: 'date' },
      '@created': { type: 'date' },
    },
  },
};
