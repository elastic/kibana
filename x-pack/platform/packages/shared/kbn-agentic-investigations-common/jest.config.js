/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/jest',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/packages/shared/kbn-agentic-investigations-common'],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/packages/shared/kbn-agentic-investigations-common/**/*.{js,ts,tsx}',
  ],
  coverageReporters: ['html'],
  moduleNameMapper: {
    // Static EUI icon assets are ESM; Jest needs a CJS stub.
    '^@elastic/eui/es/components/icon/assets/(.*)$':
      '<rootDir>/x-pack/platform/packages/shared/kbn-agentic-investigations-common/__mocks__/eui_icon_assets.js',
  },
};
