/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SEARCH_PROFILER_TAGS = [
  '@local-stateful-classic',
  '@local-serverless-search',
  '@local-serverless-observability_complete',
  '@local-serverless-security_complete',
] satisfies string[];

export const SEARCH_PROFILER_SERVERLESS_TAGS = [
  '@local-serverless-search',
  '@local-serverless-observability_complete',
  '@local-serverless-security_complete',
] satisfies string[];

export const SEARCH_PROFILER_USER_ROLE = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['*'],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: {
        dev_tools: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

export const SIMPLE_QUERY = JSON.stringify(
  {
    query: {
      match_all: {},
    },
  },
  null,
  2
);
