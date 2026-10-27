/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { transformIgnorePatterns } = require('./src/test_helpers/jest_transform');

module.exports = {
  preset: '@kbn/jest',
  rootDir: '../../../../../..',
  roots: ['<rootDir>/x-pack/platform/packages/shared/isomer/isomer-primitives-vega'],
  setupFilesAfterEnv: [
    '<rootDir>/x-pack/platform/packages/shared/isomer/isomer-primitives-vega/src/test_helpers/jest_setup.js',
  ],
  // Kibana's resolver ignores `exports`, and `vega-canvas`'s source entry has a top-level await.
  moduleNameMapper: {
    '^vega-canvas$': '<rootDir>/node_modules/vega-canvas/build/vega-canvas.browser.js',
  },
  transformIgnorePatterns,
};
