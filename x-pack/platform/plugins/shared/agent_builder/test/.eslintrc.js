/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  overrides: [
    {
      files: ['scout_agent_builder/api/**/*.ts', 'scout_agent_builder_smoke/api/**/*.ts'],
      rules: {
        '@kbn/eslint/scout_require_api_client_in_api_test': [
          'error',
          { alternativeFixtures: ['esClient', 'asAdmin', 'asViewer', 'asPrivilegedUser'] },
        ],
      },
    },
  ],
};
