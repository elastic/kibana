/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STANDARD_HTTP_HEADERS = Object.freeze({
  'kbn-xsrf': 'cypress-creds-via-env',
  'x-elastic-internal-origin': 'security-solution',
  'elastic-api-version': '2023-10-31',
});
