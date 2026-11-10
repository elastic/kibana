/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/jest',
  rootDir: '../../..',
  roots: ['<rootDir>/x-pack/examples/lens_exemplars_example'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/examples/lens_exemplars_example',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: ['<rootDir>/x-pack/examples/lens_exemplars_example/public/**/*.{ts,tsx}'],
};
