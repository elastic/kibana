/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/packages/kbn_langgraph_checkpoint_saver',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/packages/shared/kbn-langgraph-checkpoint-saver/server/**/*.{ts}',
    '!<rootDir>/x-pack/platform/packages/shared/kbn-langgraph-checkpoint-saver/server/{__test__,__snapshots__,__examples__,*mock*,tests,test_helpers,integration_tests,types}/**/*',
    '!<rootDir>/x-pack/platform/packages/shared/kbn-langgraph-checkpoint-saver/server/*mock*.{ts}',
    '!<rootDir>/x-pack/platform/packages/shared/kbn-langgraph-checkpoint-saver/server/*.test.{ts}',
    '!<rootDir>/x-pack/platform/packages/shared/kbn-langgraph-checkpoint-saver/server/*.d.ts',
    '!<rootDir>/x-pack/platform/packages/shared/kbn-langgraph-checkpoint-saver/server/*.config.ts',
  ],
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/packages/shared/kbn-langgraph-checkpoint-saver'],
};
