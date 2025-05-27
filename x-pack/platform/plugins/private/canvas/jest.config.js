/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/x-pack/platform/plugins/private/canvas'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/platform/plugins/private/canvas',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/plugins/private/canvas/{canvas_plugin_src,common,i18n,public,server,shareable_runtime}/**/*.{js,ts,tsx}',
  ],
  setupFiles: ['<rootDir>/x-pack/platform/plugins/private/canvas/jest_setup.ts'],
};
