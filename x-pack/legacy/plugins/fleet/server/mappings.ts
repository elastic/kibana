/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mappings = {
  agents: {
    properties: {
      shared_id: {
        type: 'text',
      },
      type: {
        type: 'text',
      },
      active: {
        type: 'boolean',
      },
      enrolled_at: {
        type: 'date',
      },
      access_token: {
        type: 'text',
      },
      version: {
        type: 'text',
      },
      user_provided_metadata: {
        properties: {},
        dynamic: true,
      },
      local_metadata: {
        properties: {},
        dynamic: true,
      },
      config_shared_id: {
        type: 'text',
      },
      config_id: {
        type: 'text',
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
