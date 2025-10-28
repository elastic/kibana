/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/automatic_import_v2'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/x-pack/platform/plugins/shared/automatic_import_v2',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/plugins/shared/automatic_import_v2/{common,server,public}/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/platform/plugins/shared/automatic_import_v2/{__jest__}/**/*',
    '!<rootDir>/x-pack/platform/plugins/shared/automatic_import_v2/**/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/platform/plugins/shared/automatic_import_v2/**/*.config.ts',
  ],
  setupFiles: ['jest-canvas-mock'],
};
