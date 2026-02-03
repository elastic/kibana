/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPluginVitestConfig } from '@kbn/vitest';

export default createPluginVitestConfig({
  importMetaUrl: import.meta.url,
  pluginDir: 'x-pack/platform/plugins/shared/streams_app',
  testDirs: ['public', 'common', 'server'],
  // Note: The storybook jest_setup.js is not needed for unit tests.
  // It imports heavy dependencies (Monaco, EUI themes, etc.) that slow down tests.
  // If a test needs storybook context, import the decorator directly in that test.
  coverage: {
    enabled: false,
    include: ['{public,common,server}/**/*.{js,ts,tsx}'],
    reporters: ['html'],
  },
});
