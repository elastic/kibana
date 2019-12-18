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
      label: {
        type: 'keyword',
      },
      datasources: {
        type: 'keyword',
      },
      id: {
        type: 'keyword',
      },
      status: {
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
  datasources: {
    properties: {
      id: {
        type: 'keyword',
      },
      name: {
        type: 'keyword',
      },
      package: {
        properties: {
          assets: {
            properties: {
              id: {
                type: 'keyword',
              },
              type: {
                type: 'keyword',
              },
            },
          },
          description: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          title: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
      },
      read_alias: {
        type: 'keyword',
      },
      streams: {
        properties: {
          config: {
            type: 'flattened',
          },
          id: {
            type: 'keyword',
          },
          input: {
            type: 'flattened',
          },
          output_id: {
            type: 'keyword',
          },
          processors: {
            type: 'keyword',
          },
        },
      },
    },
  },
};
