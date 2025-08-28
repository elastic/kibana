/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test/jest_integration',
  rootDir: '../../../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/fleet/server/integration_tests'],
  // must override to match all test given there is no nested `integration_tests` subfolder
  testMatch: [
    '<rootDir>/x-pack/platform/plugins/shared/fleet/server/integration_tests/**/*.test.{js,mjs,ts,tsx}',
  ],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/platform/plugins/shared/fleet/server/integration_tests',
  collectCoverageFrom: ['<rootDir>/x-pack/platform/plugins/shared/fleet/server/**/*.{ts,tsx}'],
  workerIdleMemoryLimit: '2gb',
};
