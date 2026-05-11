/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SEARCH_PROFILER_API_TAGS = [
  '@local-serverless-search',
  '@local-serverless-observability_complete',
  '@local-serverless-security_complete',
] satisfies string[];

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const SIMPLE_QUERY = {
  query: {
    match_all: {},
  },
};
