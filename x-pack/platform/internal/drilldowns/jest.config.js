/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../..',
  roots: ['<rootDir>/x-pack/platform/internal/drilldowns'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/platform/internal/drilldowns',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/internal/drilldowns/url_drilldown/public/**/*.{ts,tsx}',
  ],
};
