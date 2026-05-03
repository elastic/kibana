/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Alerting v2 API tests interact with endpoints through the typed
// `apiServices.alertingV2.*` services that wrap `kbnClient`, instead of using
// the raw `apiClient` fixture. Allow `apiServices` as an accepted fixture so
// the rule still flags tests that interact with no fixture at all.
module.exports = {
  rules: {
    '@kbn/eslint/scout_require_api_client_in_api_test': [
      'error',
      { alternativeFixtures: ['esClient', 'apiServices'] },
    ],
  },
};
