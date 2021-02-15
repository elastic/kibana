/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  rootDir: '..',
  projects: ['<rootDir>/x-pack/plugins/*/jest.config.js'],
  reporters: [
    'default',
    ['<rootDir>/packages/kbn-test/target/jest/junit_reporter', { reportName: 'X-Pack Jest Tests' }],
  ],
};
