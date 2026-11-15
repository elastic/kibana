/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const API_BASE_PATH = 'api/index_management';
export const INTERNAL_API_BASE_PATH = 'internal/index_management';
export const ES_CLIENT_PROXY_PATH = 'internal/es_client';
export const ES_CLIENT_API_VERSION = '1';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};
