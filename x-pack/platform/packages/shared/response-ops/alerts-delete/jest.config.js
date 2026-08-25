/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../../..',
  roots: ['<rootDir>/x-pack/platform/packages/shared/response-ops/alerts-delete'],
  setupFilesAfterEnv: [
    '<rootDir>x-pack/platform/packages/shared/response-ops/alerts-delete/setup_tests.ts',
  ],
};
