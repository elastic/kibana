/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Common HTTP headers used across Transform API tests
 */
export const COMMON_API_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;

/**
 * Helper function to merge common headers with custom headers
 */
export function getCommonHeaders(additionalHeaders: Record<string, string> = {}) {
  return {
    ...COMMON_API_HEADERS,
    ...additionalHeaders,
  };
}
