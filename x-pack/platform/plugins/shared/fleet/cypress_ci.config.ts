/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCypressConfig } from '@kbn/cypress-config';

// eslint-disable-next-line import/no-default-export
export default defineCypressConfig({
  reporter: '../../../../../node_modules/cypress-multi-reporters',
  reporterOptions: {
    configFile: './cypress/reporter_config.json',
  },
  defaultCommandTimeout: 60000,
  requestTimeout: 60000,
  responseTimeout: 60000,
  execTimeout: 120000,
  pageLoadTimeout: 120000,

  retries: {
    runMode: 2,
  },

  env: {
    grepFilterSpecs: false,
  },

  screenshotsFolder: '../../../../../target/kibana-fleet/cypress/screenshots',
  trashAssetsBeforeRuns: false,
  video: false,
  videosFolder: '../../../../../target/kibana-fleet/cypress/videos',
  viewportHeight: 900,
  viewportWidth: 1440,
  screenshotOnRunFailure: true,

  e2e: {
    baseUrl: 'http://localhost:5601',

    experimentalRunAllSpecs: true,
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 3,

    specPattern: './cypress/e2e/**/*.cy.ts',
    supportFile: './cypress/support/e2e.ts',
    excludeSpecPattern: './cypress/e2e/space_awareness/**/*.cy.ts',

    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @kbn/imports/no_boundary_crossing
      return require('@kbn/fleet-plugin-cypress/plugins')(on, config);
    },
  },
});
