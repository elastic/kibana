/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/jest',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/workflows_execution_engine'],
  testMatch: [
    '<rootDir>/x-pack/platform/plugins/shared/workflows_execution_engine/**/*.test.{js,ts,tsx}',
  ],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/platform/plugins/shared/workflows_execution_engine',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/plugins/shared/workflows_execution_engine/{common,public,server}/**/*.{js,ts,tsx}',
    '<rootDir>/x-pack/platform/plugins/shared/workflows_execution_engine/jest_integ_tests/**/*.{js,ts,tsx}',
    '!<rootDir>/x-pack/platform/plugins/shared/workflows_execution_engine/jest_integ_tests/mocks/**',
  ],
};
