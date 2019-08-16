/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mappings = {
  agents: {
    properties: {
      shared_id: {
        type: 'keyword',
      },
      type: {
        type: 'keyword',
      },
      active: {
        type: 'boolean',
      },
      enrolled_at: {
        type: 'date',
      },
      access_token: {
        type: 'keyword',
      },
      version: {
        type: 'keyword',
      },
      user_provided_metadata: {
        type: 'text',
      },
      local_metadata: {
        type: 'text',
      },
      config_shared_id: {
        type: 'keyword',
      },
      config_id: {
        type: 'keyword',
      },
      last_updated: {
        type: 'date',
      },
      last_checkin: {
        type: 'date',
      },
    },
  },
};
