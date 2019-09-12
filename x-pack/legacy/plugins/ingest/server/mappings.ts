/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mappings = {
  policies: {
    properties: {
      name: {
        type: 'text',
      },
      description: {
        type: 'text',
      },
      monitoring_enabled: {
        type: 'boolean',
      },
      agent_version: {
        type: 'keyword',
      },
      data_sources: {
        properties: {
          uuid: {
            type: 'keyword',
          },
          meta: {
            type: 'keyword',
          },
          output: {
            type: 'keyword',
          },
          queue: {
            type: 'keyword',
          },
          policy_id: {
            type: 'keyword',
          },
          policy: {
            type: 'keyword',
          },
          inputs: {
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
      created_on: {
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
  inputs: {
    properties: {
      other: {
        type: 'text',
      },
      data_source_id: {
        type: 'keyword',
      },
    },
  },
};
