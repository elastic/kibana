/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/packages/kbn-elastic-assistant-shared-state',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/packages/shared/kbn-elastic-assistant-shared-state/src/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/platform/packages/shared/kbn-elastic-assistant-shared-state/src/{__test__,__snapshots__,__examples__,*mock*,tests,test_helpers,integration_tests,types}/**/*',
    '!<rootDir>/x-pack/platform/packages/shared/kbn-elastic-assistant-shared-state/src/*mock*.{ts,tsx}',
    '!<rootDir>/x-pack/platform/packages/shared/kbn-elastic-assistant-shared-state/src/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/platform/packages/shared/kbn-elastic-assistant-shared-state/src/*.d.ts',
    '!<rootDir>/x-pack/platform/packages/shared/kbn-elastic-assistant-shared-state/src/*.config.ts',
  ],
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/packages/shared/kbn-elastic-assistant-shared-state'],
};
