/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

const createRole = (viewPrivileges: string[]): KibanaRole => ({
  elasticsearch: {
    cluster: [],
    indices:
      viewPrivileges.length > 0
        ? [
            {
              names: ['*'],
              privileges: viewPrivileges,
            },
          ]
        : [],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
});

export const ESQL_VIEWS_NO_ACCESS_ROLE = createRole([]);
export const ESQL_VIEWS_READ_ONLY_ROLE = createRole(['read_view_metadata']);
export const ESQL_VIEWS_CREATE_ROLE = createRole(['read_view_metadata', 'create_view']);
export const ESQL_VIEWS_DELETE_ROLE = createRole(['read_view_metadata', 'delete_view']);
