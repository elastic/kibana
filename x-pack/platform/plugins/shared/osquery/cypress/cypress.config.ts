/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

import { getCypressBaseConfig } from './cypress_base.config';

export default defineCypressConfig(
  getCypressBaseConfig({
    env: {
      grepTags: '@ess',
    },
    e2e: {
      baseUrl: 'http://localhost:5601',
    },
  })
);
