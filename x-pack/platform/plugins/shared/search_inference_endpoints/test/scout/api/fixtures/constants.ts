/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const API_PATH = '/internal/search_inference_endpoints/settings';
export const API_VERSION = '1';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': API_VERSION,
};

export const ROLE_ALL = {
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

export const ROLE_FEATURE_ONLY = {
  kibana: [{ base: [], feature: { searchInferenceEndpoints: ['all'] }, spaces: ['*'] }],
};

export const ROLE_NO_ACCESS = {
  kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
};
