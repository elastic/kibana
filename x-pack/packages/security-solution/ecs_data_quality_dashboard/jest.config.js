/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/packages/security-solution/ecs_data_quality_dashboard_impl',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/packages/security-solution/ecs_data_quality_dashboard/impl/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/packages/security-solution/ecs_data_quality_dashboard/impl/{__test__,__snapshots__,__examples__,*mock*,tests,test_helpers,integration_tests,types}/**/*',
    '!<rootDir>/x-pack/packages/security-solution/ecs_data_quality_dashboard/impl/*mock*.{ts,tsx}',
    '!<rootDir>/x-pack/packages/security-solution/ecs_data_quality_dashboard/impl/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/packages/security-solution/ecs_data_quality_dashboard/impl/*.d.ts',
    '!<rootDir>/x-pack/packages/security-solution/ecs_data_quality_dashboard/impl/*.config.ts',
  ],
  preset: '@kbn/test',
  rootDir: '../../../..',
  roots: ['<rootDir>/x-pack/packages/security-solution/ecs_data_quality_dashboard'],
  setupFilesAfterEnv: [
    '<rootDir>/x-pack/packages/security-solution/ecs_data_quality_dashboard/setup_tests.ts',
  ],
};
