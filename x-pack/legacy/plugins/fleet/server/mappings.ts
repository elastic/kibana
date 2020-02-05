/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mappings = {
  enrollment_api_keys: {
    properties: {
      name: {
        type: 'keyword',
      },
      type: {
        type: 'keyword',
      },
      api_key: {
        type: 'binary',
      },
      api_key_id: {
        type: 'keyword',
      },
      policy_id: {
        type: 'keyword',
      },
      created_at: {
        type: 'date',
      },
      updated_at: {
        type: 'date',
      },
      expire_at: {
        type: 'date',
      },
      active: {
        type: 'boolean',
      },
    },
  },
};
