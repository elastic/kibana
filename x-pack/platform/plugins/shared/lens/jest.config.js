/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Do not reintroduce Jest's `projects` field here: `scripts/jest` hands Jest the resolved config
// as inline JSON, so every project re-resolved to this file instead of its own — running each Lens
// test three times and silently dropping the `setupFiles`/`setupFilesAfterEnv` below.

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/lens'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/platform/plugins/shared/lens',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/plugins/shared/lens/{common,public,server}/**/*.{ts,tsx}',
  ],
  setupFiles: ['jest-canvas-mock'],
  setupFilesAfterEnv: [
    '<rootDir>/x-pack/platform/plugins/shared/lens/public/jest_setup_lens_builder.ts',
    '<rootDir>/x-pack/platform/plugins/shared/lens/public/jest_setup_mutation_observer.ts',
  ],
};
