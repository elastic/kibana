/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { createKbnVitestConfig } = require('@kbn/test/vitest/preset');

module.exports = createKbnVitestConfig({
  environment: 'jsdom',
  roots: ['x-pack/platform/plugins/shared/stack_connectors'],
  aliases: [
    {
      find: /^@elastic\/eui\/es\/components\/icon\/assets\/(.*)$/,
      replacement: 'x-pack/platform/plugins/shared/stack_connectors/__mocks__/eui_icon_assets.js',
    },
    {
      find: /^@kbn\/code-editor$/,
      replacement:
        'x-pack/platform/plugins/shared/stack_connectors/__mocks__/@kbn/code-editor/index.tsx',
    },
  ],
});
