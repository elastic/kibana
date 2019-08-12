/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mappings = {
  configurations: {
    properties: {
      name: {
        type: 'text',
      },
      description: {
        type: 'text',
      },
      output: {
        type: 'keyword',
      },
      monitoring_enabled: {
        type: 'boolean',
      },
      agent_version: {
        type: 'keyword',
      },
      data_sources: {
        properties: {
          id: {
            type: 'keyword',
          },
          meta: {
            type: 'keyword',
          },
          config_id: {
            type: 'keyword',
          },
          config: {
            type: 'keyword',
          },
        },
      },
      id: {
        type: 'keyword',
      },
      shared_id: {
        type: 'keyword',
      },
      version: {
        type: 'integer',
      },
      status: {
        type: 'keyword',
      },
      updated_at: {
        type: 'keyword',
      },
      created_by: {
        type: 'keyword',
      },
      updated_on: {
        type: 'keyword',
      },
      updated_by: {
        type: 'keyword',
      },
    },
  },
};
