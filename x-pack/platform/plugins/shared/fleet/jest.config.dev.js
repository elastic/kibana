/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test/jest',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/shared/fleet'],
  projects: [
    '<rootDir>/x-pack/platform/plugins/shared/fleet/common/*/jest.config.js',
    '<rootDir>/x-pack/platform/plugins/shared/fleet/server/*/jest.config.js',
    '<rootDir>/x-pack/platform/plugins/shared/fleet/public/*/jest.config.js',
  ],
};
