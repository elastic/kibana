/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/jest',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/osquery'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/platform/plugins/shared/osquery',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/plugins/shared/osquery/{common,public,server}/**/*.{ts,tsx}',
    // The plugin array replaces the preset's, so its negations are mirrored here, scoped to the plugin.
    '!<rootDir>/x-pack/platform/plugins/shared/osquery/**/{__tests__,__mocks__,__test_helpers__,__snapshots__,__examples__,__test__,*mock*,tests,test_helpers,integration_tests,types}/**/*',
    '!<rootDir>/x-pack/platform/plugins/shared/osquery/**/*mock*.{ts,tsx}',
    '!<rootDir>/x-pack/platform/plugins/shared/osquery/**/test_utils.{ts,tsx}',
    '!<rootDir>/x-pack/platform/plugins/shared/osquery/**/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/platform/plugins/shared/osquery/**/*.d.ts',
    '!<rootDir>/x-pack/platform/plugins/shared/osquery/**/index.{js,ts,tsx}',
  ],
};
