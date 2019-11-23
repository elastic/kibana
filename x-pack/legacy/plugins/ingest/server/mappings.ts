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
